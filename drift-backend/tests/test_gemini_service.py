import pytest
from unittest.mock import MagicMock, patch
from app.services import gemini_service

def test_fallback_analysis_technical():
    res = gemini_service.get_fallback_analysis("There is a bug in the database connection library.", "No history.")
    assert res["tag"] == "Technical Blocker"
    assert "[AI Offline]" in res["reflection"]
    assert res["severity"] == 2

def test_fallback_analysis_underestimated():
    res = gemini_service.get_fallback_analysis("The task took much longer than I originally estimated.", "No history.")
    assert res["tag"] == "Underestimated Effort"
    assert res["severity"] == 1

def test_fallback_analysis_external():
    res = gemini_service.get_fallback_analysis("Waiting for the client to approve the api design.", "No history.")
    assert res["tag"] == "External Dependency"
    assert res["severity"] == 2

def test_fallback_analysis_scope_creep():
    res = gemini_service.get_fallback_analysis("Added extra features during design phase.", "No history.")
    assert res["tag"] == "Scope Creep"
    assert res["severity"] == 3

def test_fallback_analysis_personal():
    res = gemini_service.get_fallback_analysis("I was sick and tired.", "No history.")
    assert res["tag"] == "Personal"
    assert res["severity"] == 1

@patch("app.services.gemini_service.client")
def test_analyze_extension_text_success(mock_client):
    # Setup mock response
    mock_response = MagicMock()
    mock_response.text = '{"tag": "Technical Blocker", "reflection": "spike earlier", "severity": 2}'
    mock_client.models.generate_content.return_value = mock_response

    # Temporarily set HAS_API_KEY to True
    with patch("app.services.gemini_service.HAS_API_KEY", True):
        res = gemini_service.analyze_extension_text("My library crashed", "history")
        assert res["tag"] == "Technical Blocker"
        assert res["reflection"] == "spike earlier"
        assert res["severity"] == 2
        assert res["transcription"] == "My library crashed"

@patch("app.services.gemini_service.client")
def test_analyze_extension_audio_success(mock_client):
    mock_response = MagicMock()
    mock_response.text = '{"tag": "Personal", "reflection": "rest more", "severity": 1, "transcription": "I felt tired today"}'
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini_service.HAS_API_KEY", True):
        res = gemini_service.analyze_extension_audio(b"fake_audio_bytes", "audio/wav", "history")
        assert res["tag"] == "Personal"
        assert res["reflection"] == "rest more"
        assert res["severity"] == 1
        assert res["transcription"] == "I felt tired today"
