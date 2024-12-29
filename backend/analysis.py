import cv2
import numpy as np
import os

def get_video_stats(video_path):
    """
    Get statistics about a video file
    
    Args:
        video_path (str): Path to video file
    
    Returns:
        dict: Dictionary containing video statistics
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        stats = {
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'duration': cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS),
            'file_size': os.path.getsize(video_path)
        }
        
        cap.release()
        return stats
        
    except Exception as e:
        print(f"Error getting video stats: {str(e)}")
        return None

def invert_video_colors(video_path, output_path):
    """
    Takes a video file, inverts its colors, and saves the result
    
    Args:
        video_path (str): Path to input video file
        output_path (str): Path where inverted video will be saved
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Open the video file
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return False

        # Get video properties
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))

        # Create temporary AVI file (intermediate step)
        temp_avi = os.path.join(os.path.dirname(output_path), "temp_output.avi")
        
        # Create VideoWriter object for AVI
        fourcc_avi = cv2.VideoWriter_fourcc(*'XVID')
        out_avi = cv2.VideoWriter(temp_avi, fourcc_avi, fps, (frame_width, frame_height))

        # Process each frame
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Invert the colors
            inverted_frame = cv2.bitwise_not(frame)
            
            # Write the inverted frame
            out_avi.write(inverted_frame)

        # Release resources
        cap.release()
        out_avi.release()

        # Convert AVI to MP4 using FFmpeg
        import subprocess
        try:
            subprocess.run([
                'ffmpeg',
                '-i', temp_avi,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-movflags', '+faststart',
                '-y',  # Overwrite output file if it exists
                output_path
            ], check=True)
            
            # Remove temporary AVI file
            os.remove(temp_avi)
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {str(e)}")
            return False

    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return False

def process_uploaded_video(video_file):
    """
    Processes an uploaded video file
    
    Args:
        video_file: Flask file object from request.files
    
    Returns:
        dict: Dictionary containing processing results and output path
    """
    try:
        # Create temporary directories if they don't exist
        temp_dir = "temp"
        output_dir = "output"
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

        # Save uploaded file
        input_path = os.path.join(temp_dir, "input_video.mp4")
        video_file.save(input_path)

        # Get original video stats
        original_stats = get_video_stats(input_path)
        if not original_stats:
            return {
                "success": False,
                "message": "Failed to analyze video"
            }

        # Process the video
        output_path = os.path.join(output_dir, "inverted_video.mp4")
        success = invert_video_colors(input_path, output_path)

        if success:
            # Get processed video stats
            processed_stats = get_video_stats(output_path)
            return {
                "success": True,
                "message": "Video processed successfully",
                "output_path": output_path,
                "original_stats": original_stats,
                "processed_stats": processed_stats
            }
        else:
            return {
                "success": False,
                "message": "Failed to process video"
            }

    except Exception as e:
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }
