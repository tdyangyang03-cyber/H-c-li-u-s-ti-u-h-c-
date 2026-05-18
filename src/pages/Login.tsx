import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Users, GraduationCap, ArrowLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserData } from '../App';

interface LoginProps {
  onStudentLogin: (user: UserData) => void;
}

export default function Login({ onStudentLogin }: LoginProps) {
  const [view, setView] = useState<'select' | 'teacher' | 'student'>('select');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Prompt for account selection to ensure it doesn't get stuck
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google Login Error:', error);
      if (error?.code === 'auth/popup-blocked') {
        alert('Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép hiện popup và thử lại!');
      } else if (error?.code === 'auth/admin-restricted-operation') {
        alert('Lỗi: auth/admin-restricted-operation. Điều này thường do Google Login chưa được bật trong Firebase Console (Authentication > Sign-in method). Vui lòng kiểm tra lại cấu hình Firebase.');
      } else if (error?.code === 'auth/operation-not-allowed') {
        alert('Tính năng đăng nhập này chưa được bật trong cấu hình Firebase. Vui lòng kiểm tra tab Sign-in method.');
      } else {
        alert(`Đăng nhập thất bại: ${error?.message || 'Vui lòng thử lại!'}`);
      }
    }
  };

  const loginAsStudent = async () => {
    if (!username || !password) {
      alert('Vui lòng nhập đầy đủ mã và mật khẩu!');
      return;
    }
    setLoading(true);
    try {
      // 1. First, search for the student document
      const q = query(
        collection(db, 'users'), 
        where('username', '==', username),
        where('role', '==', 'student')
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert('Mã đăng nhập hoặc mật khẩu không chính xác!');
      } else {
        const studentDoc = snap.docs[0];
        const studentData = studentDoc.data() as UserData;
        
        // @ts-ignore
        if (studentData.password === password) {
          localStorage.setItem('student_user', JSON.stringify(studentData));
          onStudentLogin(studentData);
        } else {
          alert('Mã đăng nhập hoặc mật khẩu không chính xác!');
        }
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối hệ thống!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-chibi-blue via-white to-chibi-pink overflow-hidden relative">
      {/* Decorative elements */}
      <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute top-20 left-[10%] opacity-20"><img src="https://api.iconify.design/noto:cloud.svg" className="w-24" /></motion.div>
      <motion.div animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute bottom-20 right-[10%] opacity-20"><img src="https://api.iconify.design/noto:sun.svg" className="w-32" /></motion.div>
      <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute top-10 right-[20%] text-6xl opacity-10">🌈</motion.div>
      <motion.div animate={{ scale: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 3, delay: 1 }} className="absolute top-1/4 left-[30%] text-2xl sparkle">⭐</motion.div>
      <motion.div animate={{ scale: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 2 }} className="absolute bottom-1/4 right-[40%] text-2xl sparkle">🌟</motion.div>
      <motion.div animate={{ y: [0, -50, 0] }} transition={{ repeat: Infinity, duration: 8 }} className="absolute bottom-10 left-[5%] text-4xl opacity-10 font-bold">🎈</motion.div>

      <AnimatePresence mode="wait">
        {view === 'select' ? (
          <motion.div 
            key="select"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-center"
          >
            <div className="col-span-full mb-8">
               <motion.img 
                src="https://api.iconify.design/noto:bear.svg" 
                className="w-24 h-24 mx-auto mb-4 floating"
               />
               <h1 className="text-4xl font-black text-gray-800 tracking-tight">Học Liệu Số Tiểu Học 🌟</h1>
               <p className="text-gray-500 font-bold mt-2">Hệ sinh thái học tập thông minh dành cho bạn!</p>
            </div>

            <button 
              onClick={() => setView('teacher')}
              className="group card-chibi hover:border-chibi-blue transition-all flex flex-col items-center p-10 hover:shadow-2xl hover:-translate-y-2"
            >
               <div className="w-32 h-32 bg-chibi-blue/10 rounded-full flex items-center justify-center mb-6 border-4 border-chibi-blue/20 group-hover:bg-chibi-blue transition-colors">
                  <Users className="w-16 h-16 text-chibi-blue group-hover:text-white" />
               </div>
               <h2 className="text-2xl font-black text-gray-800 mb-2">BẠN LÀ GIÁO VIÊN 👩‍🏫</h2>
               <p className="text-gray-400 font-medium text-sm">Quản lý lớp học, học liệu và theo dõi học sinh.</p>
               <div className="mt-6 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-chibi-blue group-hover:text-white transition-all">
                  <ChevronRight />
               </div>
            </button>

            <button 
              onClick={() => setView('student')}
              className="group card-chibi hover:border-chibi-pink transition-all flex flex-col items-center p-10 hover:shadow-2xl hover:-translate-y-2"
            >
               <div className="w-32 h-32 bg-chibi-pink/10 rounded-full flex items-center justify-center mb-6 border-4 border-chibi-pink/20 group-hover:bg-chibi-pink transition-colors">
                  <GraduationCap className="w-16 h-16 text-chibi-pink group-hover:text-white" />
               </div>
               <h2 className="text-2xl font-black text-gray-800 mb-2">BẠN LÀ HỌC SINH 👦</h2>
               <p className="text-gray-400 font-medium text-sm">Khám phá bài học, trò chơi và thành tích học tập.</p>
               <div className="mt-6 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-chibi-pink group-hover:text-white transition-all">
                  <ChevronRight />
               </div>
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="login-form"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl border-8 border-white text-center relative"
          >
            <button 
              onClick={() => setView('select')}
              className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all"
            >
              <ArrowLeft size={20} />
            </button>

            <motion.img 
              src={`https://api.iconify.design/noto:${view === 'teacher' ? 'teacher' : 'student'}.svg`} 
              className="w-20 h-20 mx-auto mb-6"
            />
            <h2 className="text-2xl font-black text-gray-800 mb-8 uppercase tracking-tight">
              Đăng nhập {view === 'teacher' ? 'Giáo viên' : 'Học sinh'}
            </h2>

            {view === 'teacher' ? (
              <button 
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa/google.svg" className="w-5 h-5" />
                Tiếp tục với Gmail
              </button>
            ) : (
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Mã đăng nhập</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-chibi-blue outline-none transition-all font-bold"
                    placeholder="Nhập mã học sinh..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Mật khẩu</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-chibi-blue outline-none transition-all font-bold"
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
                <button 
                  onClick={loginAsStudent}
                  className="w-full btn-chibi bg-chibi-pink text-white border-chibi-pink/50 mt-4"
                >
                  Vào học ngay ✨
                </button>
              </div>
            )}
            
            <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">Học Liệu Số • 2026</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
