import unittest
from unittest.mock import patch, MagicMock
from news_digest import get_news_digest, clean_content, get_search_content
from google.genai import types

class TestNewsDigest(unittest.TestCase):
    @patch('news_digest.genai.Client')
    def test_get_news_digest_success(self, mock_client):
        # Mock the Gemini API response
        mock_response = MagicMock()
        mock_response.text = "Test content"
        mock_response.candidates = [MagicMock()]
        mock_response.candidates[0].grounding_metadata = None
        
        mock_client.return_value.models.generate_content.return_value = mock_response

        result = get_news_digest(teams=['New York Yankees'], players=['Aaron Judge'])
        
        self.assertTrue(result['success'])
        self.assertEqual(len(result['digests']), 2)  # One for team, one for player
        
    def test_clean_content(self):
        test_cases = [
            ("Here's the requested information: Test", "Test"),
            ("Based on the latest information: Content", "Content"),
            ("Raw content", "Raw content"),
        ]
        
        for input_text, expected in test_cases:
            result = clean_content(input_text)
            self.assertEqual(result, expected)

    def test_get_search_content(self):
        mock_response = MagicMock()
        mock_response.candidates = [MagicMock()]
        mock_response.candidates[0].grounding_metadata = None
        
        # Test with no grounding metadata
        result = get_search_content(mock_response)
        self.assertEqual(result, "Generated using Google Gemini AI with web search")
        
        # Test with grounding metadata
        mock_metadata = MagicMock()
        mock_metadata.search_entry_point.rendered_content = "Test content"
        mock_response.candidates[0].grounding_metadata = mock_metadata
        
        result = get_search_content(mock_response)
        self.assertEqual(result, "Test content")

    def test_get_news_digest_error(self):
        """Test error handling in get_news_digest"""
        result = get_news_digest(teams=None, players=None)
        self.assertFalse(result['success'])
        self.assertIn('error', result)

    def test_get_news_digest_empty_inputs(self):
        """Test get_news_digest with empty inputs"""
        result = get_news_digest(teams=[], players=[])
        self.assertFalse(result['success'])
        self.assertIn('error', result)

    @patch('news_digest.genai.Client')
    def test_get_news_digest_api_error(self, mock_client):
        """Test API error handling"""
        mock_client.return_value.models.generate_content.side_effect = Exception("API Error")
        
        result = get_news_digest(teams=['New York Yankees'])
        
        self.assertFalse(result['success'])
        self.assertIn('error', result) 