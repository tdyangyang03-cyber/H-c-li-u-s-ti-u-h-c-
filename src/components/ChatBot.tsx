import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Star, Mic, Camera, Volume2, Trash2, StopCircle } from 'lucide-react';
import { UserData } from '../App';

interface Message {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export default function ChatBot({ user }: { user: UserData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'vi-VN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if ((!message.trim() && !capturedImage) || isLoading) return;

    const parts: any[] = [];
    if (message.trim()) parts.push({ text: message });
    if (capturedImage) {
      const base64Data = capturedImage.split(',')[1];
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
    }

    const userMessage: Message = { role: 'user', parts };
    setMessages(prev => [...prev, userMessage]);
    
    const currentMessage = message;
    const currentImage = capturedImage;
    
    setMessage('');
    setCapturedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          imageData: currentImage ? currentImage.split(',')[1] : null,
          history: messages.map(m => ({
            role: m.role,
            parts: m.parts.map(p => p.text ? { text: p.text } : null).filter(Boolean)
          }))
        })
      });

      const data = await response.json();
      const botMessage: Message = { role: 'model', parts: [{ text: data.text }] };
      setMessages(prev => [...prev, botMessage]);
      
      // Auto speak if it's a short response or if we want it
      if (data.text.length < 200) {
        speakText(data.text);
      }
    } catch (error) {
      console.error(error);
      const errorMessage: Message = { role: 'model', parts: [{ text: "Ôi, Gấu đang bận một chút, bạn chờ tí nhé! 🐻" }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-80 sm:w-96 h-[600px] bg-white rounded-[2.5rem] shadow-2xl border-4 border-chibi-orange flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-chibi-orange flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <img src="https://api.iconify.design/noto:bear.svg" className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Gấu Biết Tuốt 🐻</h3>
                  <p className="text-[10px] text-orange-700 font-black">HỌC TẬP VUI VẺ!</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-chibi-orange/5"
            >
              <div className="text-center mb-4">
                <span className="text-[10px] bg-white/80 px-2 py-1 rounded-full text-gray-400 font-bold uppercase tracking-wider">Hôm nay</span>
              </div>
              
              {messages.length === 0 && (
                <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-chibi-orange/30 text-center">
                  <p className="text-sm text-gray-500 font-medium whitespace-pre-wrap">Chào {user.name}! 🐻 mình là Gấu Biết Tuốt đây.\nBạn cần mình giúp gì không nè?</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed relative group ${
                    msg.role === 'user' 
                      ? 'bg-chibi-orange text-gray-800 rounded-tr-none' 
                      : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                  }`}>
                    {msg.parts.map((part, pi) => (
                      <div key={pi}>
                        {part.text && <div>{part.text}</div>}
                        {part.inlineData && (
                          <img 
                            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                            className="mt-2 rounded-xl w-full max-h-48 object-cover border-2 border-white shadow-sm"
                          />
                        )}
                      </div>
                    ))}
                    {msg.role === 'model' && (
                      <button 
                        onClick={() => speakText(msg.parts[0].text || '')}
                        className="absolute -right-8 top-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-chibi-orange"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Camera Preview */}
            <AnimatePresence>
              {showCamera && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="bg-black relative overflow-hidden"
                >
                  <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button onClick={capturePhoto} className="p-4 bg-white rounded-full shadow-xl text-chibi-orange">
                      <Camera size={24} />
                    </button>
                    <button onClick={stopCamera} className="p-4 bg-red-500 rounded-full shadow-xl text-white">
                      <X size={24} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Captured Image Preview */}
            {capturedImage && (
              <div className="p-2 px-4 bg-gray-50 border-t flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md">
                  <img src={capturedImage} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400">Hình ảnh đã sẵn sàng! 📸</p>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-50 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleRecording}
                  className={`p-3 rounded-2xl transition-all ${isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-gray-50 text-gray-400 hover:text-chibi-orange'}`}
                >
                  {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
                <button 
                  onClick={() => startCamera()}
                  className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-chibi-orange transition-all"
                >
                  <Camera size={20} />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Hỏi Gấu gì đó đi..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-chibi-orange outline-none transition-all text-sm font-medium"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={isLoading || (!message.trim() && !capturedImage)}
                    className="absolute right-2 top-1.5 p-1.5 bg-chibi-orange text-gray-800 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative"
      >
        <div className="absolute -top-12 right-0 bg-white px-3 py-2 rounded-xl shadow-lg border-2 border-chibi-orange text-xs font-bold text-chibi-orange whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
          Chat với Gấu nè! 🐻
        </div>
        <div className="w-16 h-16 bg-white rounded-full shadow-2xl border-4 border-chibi-orange flex items-center justify-center overflow-hidden">
          <img src="https://api.iconify.design/noto:bear.svg" className="w-10 h-10 group-hover:scale-110 transition-transform" />
        </div>
      </motion.button>
    </div>
  );
}
