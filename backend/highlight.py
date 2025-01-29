import vertexai
from vertexai.generative_models import GenerativeModel, Part
import moviepy.editor as mp
import ffmpeg
import numpy as np
from tempfile import NamedTemporaryFile
#pip install google-cloud-storage requests
from google.cloud import storage
import requests
import io
import os
import tempfile

vertexai.init(project=691596640324, location="us-central1")

model = GenerativeModel("gemini-1.5-flash-002")

def generate_videos(video_urls):
    video_uris = []
    i = 0
    for video in video_urls:
        video_uris.append(download_to_gcs(video,"goatbucket1","videos/" + str(i)))
        i += 1
    
    clipStartTimes = []
    for uri in video_uris:
        clipStartTimes.append(get_engaging_moments(uri))
    
    video_sections = []
    for i in range(len(video_urls)):
        video_sections.append((video_urls[i],float(clipStartTimes[i]),float(clipStartTimes[i]) + 2))
    
    # Load video clips with audio
    clips = [load_remote_video_with_audio(url, start, end) for url, start, end in video_sections]

    # Concatenate the clips (video + audio)
    final_video = mp.concatenate_videoclips(clips, method="compose")

    upload_video_to_gcs(final_video, "goatbucket1", "completeHighlights/testing") #FIX
    print("Great Success!")


def get_engaging_moments(video_uri):
    prompt = """
    Give me the most engaging two seconds of the reel. Please only capture key events and highlights. 
    If you are not sure about any info, please do not make it up. 
    Return the beginning of this two second period as a number with two decimal places. 
    Simply answer with a number, like "1.3", and nothing else.
    """

    video_file = Part.from_uri(
        uri=video_uri,
        mime_type="video/mp4",
    )

    contents = [video_file, prompt]

    response = model.generate_content(contents)
    print(response.text)
    return response.text

def load_remote_video_with_audio(url, start_time, end_time):
    """Loads a remote MP4 file with both video and audio"""
    # Create temporary files for video and audio
    temp_video = NamedTemporaryFile(delete=False, suffix=".mp4")
    temp_audio = NamedTemporaryFile(delete=False, suffix=".m4a")  # Use .m4a for AAC audio

    # Download and trim video with sound using ffmpeg
    (
        ffmpeg
        .input(url, ss=start_time, to=end_time)
        .output(temp_video.name, vcodec="libx264", acodec="aac")
        .run(overwrite_output=True)
    )

    # Extract the audio separately
    (
        ffmpeg
        .input(temp_video.name)
        .output(temp_audio.name, acodec="copy", vn=None)  # Extract AAC without re-encoding
        .run(overwrite_output=True)
    )

    # Load the video and audio in moviepy
    video_clip = mp.VideoFileClip(temp_video.name)
    audio_clip = mp.AudioFileClip(temp_audio.name)

    # Attach the trimmed audio to the video
    video_clip = video_clip.set_audio(audio_clip)

    return video_clip


def download_to_gcs(url, bucket_name, destination_blob_name):
    """
    Downloads a video from an HTTPS URL and uploads it to GCS.
    
    Args:
        url (str): The HTTPS URL of the video.
        bucket_name (str): The name of the GCS bucket.
        destination_blob_name (str): The desired path in the GCS bucket.

    Returns:
        str: The gs:// URI of the uploaded file.
    """
    # Initialize Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    
    # Stream the video file from the URL
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        # Upload to GCS
        blob.upload_from_string(response.content, content_type="video/mp4")
        print(f"Uploaded to gs://{bucket_name}/{destination_blob_name}")
        return f"gs://{bucket_name}/{destination_blob_name}"
    else:
        raise Exception(f"Failed to fetch video from {url}. HTTP status code: {response.status_code}")
    
def delete_from_gcs(bucket_name, blob_name):
    """
    Deletes a file from GCS.
    
    Args:
        bucket_name (str): The name of the GCS bucket.
        blob_name (str): The path of the file in the bucket.
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.delete()
    print(f"Deleted gs://{bucket_name}/{blob_name}")

def upload_video_to_gcs(video_clip, bucket_name, destination_blob_name):
    """Uploads a MoviePy video clip to Google Cloud Storage"""
    # Create a temporary file for the video
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
        temp_filename = temp_file.name

    # Write the video to the temporary file
    video_clip.write_videofile(
        temp_filename,
        codec="libx264",    # Video codec
        audio_codec="aac",  # Audio codec
        fps=30,             # Frames per second
        temp_audiofile="temp-audio.m4a"  # Temporary audio file required by MoviePy
    )

    # Upload to Google Cloud Storage
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Upload the temporary file
    blob.upload_from_filename(temp_filename, content_type="video/mp4")
    print(f"Uploaded video to gs://{bucket_name}/{destination_blob_name}")

    # Remove the temporary file after upload
    os.remove(temp_filename)

if __name__ == '__main__':
    video_urls = []
    video_urls.append("https://cuts.diamond.mlb.com/FORGE/2019/2019-03/28/61d1fe61-631389f2-b3138bec-csvm-diamondx64-asset_1280x720_59_4000K.mp4")
    video_urls.append("https://cuts.diamond.mlb.com/FORGE/2019/2019-03/28/8c84d6a3-654215fa-d554779f-csvm-diamondx64-asset_1280x720_59_4000K.mp4")
    video_urls.append("https://cuts.diamond.mlb.com/FORGE/2019/2019-03/28/543a359b-b70e9af2-abfe0f0a-csvm-diamondx64-asset_1280x720_59_4000K.mp4")
    generate_videos(video_urls)