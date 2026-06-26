import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Keyboard, Calendar, AlertTriangle, Sparkles, X } from 'lucide-react';
import client from '../api/client';

interface ExtensionModalProps {
  isOpen: boolean;
  taskId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
  isOpen,
  taskId,
  onClose,
  onSuccess,
}) => {
  const [extendedDays, setExtendedDays] = useState<number>(2);
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text');
  
  // Text state
  const [reasonText, setReasonText] = useState<string>('');
  
  // Voice Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [isMediaSupported, setIsMediaSupported] = useState<boolean>(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // AI Response states
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<{
    tag: string;
    reflection: string;
    severity: number;
    transcription: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    // Check browser compatibility for voice recording
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsMediaSupported(false);
      setInputMethod('text');
    }
  }, []);

  // Timer effect for voice recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start Voice Recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Close mic tracks
        stream.getTracks().forEach((track) => track.stop());
        await submitVoiceExtension(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setErrorMsg('');
    } catch (err) {
      console.error('Mic access failed:', err);
      setErrorMsg('Could not access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit Text Reason Extension
  const submitTextExtension = async () => {
    if (!reasonText.trim()) {
      setErrorMsg('Please specify a reason before submitting.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setAiResponse(null);

    try {
      const formData = new FormData();
      formData.append('extended_by_days', extendedDays.toString());
      formData.append('input_method', 'text');
      formData.append('raw_reason', reasonText);

      const response = await client.post(`/api/extensions/${taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAiResponse({
        tag: response.data.ai_tag,
        reflection: response.data.ai_reflection,
        severity: response.data.severity,
        transcription: response.data.raw_transcription,
      });
    } catch (err: any) {
      console.error('Text extension fail:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to submit extension.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Voice Extension (triggered inside recorder.onstop)
  const submitVoiceExtension = async (audioBlob: Blob) => {
    setLoading(true);
    setErrorMsg('');
    setAiResponse(null);

    try {
      const formData = new FormData();
      formData.append('extended_by_days', extendedDays.toString());
      formData.append('input_method', 'voice');
      // Pass the audio blob as a file
      formData.append('audio_file', audioBlob, 'recording.webm');

      const response = await client.post(`/api/extensions/${taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAiResponse({
        tag: response.data.ai_tag,
        reflection: response.data.ai_reflection,
        severity: response.data.severity,
        transcription: response.data.raw_transcription,
      });
    } catch (err: any) {
      console.error('Voice extension fail:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to analyze voice note.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setReasonText('');
    setAiResponse(null);
    setErrorMsg('');
    onClose();
  };

  const handleSuccessDone = () => {
    handleModalClose();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-[#07070b] bg-opacity-80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-drift-card border border-drift-border rounded-xl shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-drift-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-drift-accent" />
            <h2 className="text-lg font-bold text-white">Extend Deadline Target</h2>
          </div>
          <button 
            onClick={handleModalClose}
            className="text-drift-textMuted hover:text-white"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg p-3 text-red-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!aiResponse && !loading && (
            <div className="space-y-5">
              {/* Day count inputs */}
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                  Extend deadline by how many days?
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    value={extendedDays}
                    onChange={(e) => setExtendedDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="drift-input w-24 text-center text-lg font-bold text-white"
                  />
                  <span className="text-sm text-drift-textMuted font-medium">Day(s)</span>
                </div>
              </div>

              {/* Selector Tabs */}
              <div className="grid grid-cols-2 gap-4 bg-[#14141d] p-1 rounded-xl border border-drift-border">
                <button
                  onClick={() => setInputMethod('text')}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    inputMethod === 'text'
                      ? 'bg-drift-accent text-white shadow-md'
                      : 'text-drift-textMuted hover:text-white'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Option A: Type Reason</span>
                </button>
                
                <button
                  disabled={!isMediaSupported}
                  onClick={() => setInputMethod('voice')}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    !isMediaSupported 
                      ? 'opacity-40 cursor-not-allowed' 
                      : inputMethod === 'voice'
                        ? 'bg-drift-accent text-white shadow-md'
                        : 'text-drift-textMuted hover:text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Option B: Voice Note</span>
                </button>
              </div>

              {/* Input Area: Keyboard Input */}
              {inputMethod === 'text' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider">
                    Explain why you are shifting this deadline:
                  </label>
                  <textarea
                    rows={4}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="E.g., The third-party API integration had undocumented authentication requirements, causing blocker setup delays..."
                    className="drift-input w-full resize-none leading-relaxed text-sm"
                  />
                  <button
                    onClick={submitTextExtension}
                    className="w-full bg-drift-accent text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold text-sm transition-colors duration-200"
                  >
                    Submit & Consult Coach
                  </button>
                </div>
              )}

              {/* Input Area: Voice Recording */}
              {inputMethod === 'voice' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  {isRecording ? (
                    <>
                      {/* Form visual Waveform animation */}
                      <div className="flex items-center justify-center space-x-1.5 h-16">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => (
                          <span
                            key={bar}
                            className="w-1 bg-drift-accent rounded-full animate-bounce"
                            style={{
                              height: `${[24, 40, 56, 32, 48, 64, 36, 20][bar]}px`,
                              animationDelay: `${bar * 100}ms`,
                              animationDuration: '0.8s'
                            }}
                          />
                        ))}
                      </div>
                      
                      <span className="text-xl font-mono text-white tracking-widest">
                        {formatTimer(recordingTime)}
                      </span>

                      <button
                        onClick={stopRecording}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 hover:scale-105 transition-all duration-200 flex items-center justify-center"
                      >
                        <MicOff className="w-6 h-6 animate-pulse" />
                      </button>
                      <p className="text-xs text-red-400 animate-pulse font-semibold">
                        Recording active... Speak into your mic and tap to stop.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-[#1b1b26] border border-drift-border flex items-center justify-center text-drift-textMuted mb-2">
                        <Mic className="w-8 h-8" />
                      </div>
                      <p className="text-sm text-drift-textMuted text-center max-w-sm">
                        Tell the coach what happened. Recording will compile and submit automatically upon stopping.
                      </p>
                      <button
                        onClick={startRecording}
                        className="bg-drift-accent hover:bg-opacity-90 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-all duration-200"
                      >
                        Start Voice Note
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Consultation loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-10 h-10 border-4 border-drift-accent border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-sm text-white font-semibold">Consulting Drift AI Coach...</p>
                <p className="text-xs text-drift-textMuted mt-1">Analyzing reason patterns and history data...</p>
              </div>
            </div>
          )}

          {/* AI Response Display */}
          {aiResponse && (
            <div className="space-y-4">
              <span className="block text-xs font-semibold text-drift-accent uppercase tracking-wider select-none">
                AI Coach Assessment Response
              </span>

              {/* Transcription (especially for voice) */}
              <div className="bg-[#13131a] rounded-lg p-3 border border-drift-border">
                <span className="text-[10px] text-drift-textMuted block font-semibold mb-1 uppercase">Reason Transcribed:</span>
                <p className="text-sm text-white leading-relaxed">
                  "{aiResponse.transcription}"
                </p>
              </div>

              {/* Sparkle Coach Response container box */}
              <div className="ai-response-box">
                <div className="flex items-center justify-between border-b border-drift-border border-opacity-40 pb-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="ai-sparkle-icon w-4 h-4" />
                    <span className="text-xs font-bold text-white">Drift Coach Reflection</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Severity Rating */}
                    <span className="text-[10px] text-drift-textMuted font-semibold uppercase">Severity:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          className={`w-2 h-2 rounded-full ${
                            dot <= aiResponse.severity
                              ? aiResponse.severity === 3
                                ? 'bg-rose-500'
                                : aiResponse.severity === 2
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Tag badge */}
                    <span className="bg-drift-accent bg-opacity-25 text-drift-accent px-2 py-0.5 rounded text-[10px] font-bold uppercase select-none">
                      {aiResponse.tag}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm leading-relaxed text-gray-200">
                  {aiResponse.reflection}
                </p>
              </div>

              <button
                onClick={handleSuccessDone}
                className="w-full bg-drift-accent hover:bg-opacity-90 text-white font-semibold py-3 rounded-lg text-sm transition-colors duration-200"
              >
                Sync Timeline & Close Coach
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtensionModal;
