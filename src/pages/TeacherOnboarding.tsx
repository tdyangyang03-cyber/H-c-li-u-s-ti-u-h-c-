import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { UserData } from '../App';
import { Camera, Check } from 'lucide-react';

interface OnboardingProps {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
  };
  onComplete: (data: UserData) => void;
}

export default function TeacherOnboarding({ user, onComplete }: OnboardingProps) {
  const [name, setName] = useState(user.displayName || '');
  const [className, setClassName] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);

  const DEFAULT_TEACHER_AVATAR = 'https://api.iconify.design/noto:teacher.svg';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const teacherData: UserData = {
      uid: user.uid,
      role: 'teacher',
      name: name,
      email: user.email,
      avatar: user.photoURL || DEFAULT_TEACHER_AVATAR,
      classId: className,
      // @ts-ignore
      school: school,
    };

    try {
      await setDoc(doc(db, 'users', user.uid), teacherData);
      onComplete(teacherData);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-chibi-orange/20 via-white to-chibi-blue/10 overflow-hidden relative"
    >
      {/* Decorative floating elements */}
      <motion.div animate={{ y: [0, -40, 0], rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 8 }} className="absolute top-[10%] left-[5%] opacity-20"><img src="https://api.iconify.design/noto:balloon.svg" className="w-32" /></motion.div>
      <motion.div animate={{ y: [0, 30, 0], rotate: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 10 }} className="absolute bottom-[10%] right-[10%] opacity-20"><img src="https://api.iconify.design/noto:cloud.svg" className="w-48" /></motion.div>
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 12 }} className="absolute top-[60%] left-[20%] opacity-5"><img src="https://api.iconify.design/noto:bear.svg" className="w-64" /></motion.div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-2xl w-full bg-white rounded-[4rem] shadow-2xl border-[12px] border-white overflow-hidden relative z-10"
      >
        <div className="p-12 bg-chibi-orange text-center relative overflow-hidden">
           {/* Pattern overlay */}
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
           
           <div className="relative z-10">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] mx-auto mb-8 border-8 border-white shadow-2xl relative overflow-hidden group transform -rotate-3 hover:rotate-0 transition-transform">
                 <img src={user.photoURL || DEFAULT_TEACHER_AVATAR} alt="Avatar" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="text-white" />
                 </div>
              </div>
              <h2 className="text-4xl font-black text-white mb-2 leading-none">Hồ Sơ Giáo Viên 👨‍🏫</h2>
              <p className="text-white/80 font-bold text-lg">Hoàn thành thông tin để bắt đầu giảng dạy!</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="md:col-span-2">
                 <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-[0.3em]">
                    Họ và Tên <span className="text-red-400">*</span>
                 </label>
                 <div className="relative group">
                    <input 
                      required
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-6 text-xl rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-black text-gray-800 placeholder:text-gray-200"
                      placeholder="Nhập họ và tên đầy đủ..."
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-chibi-orange opacity-0 group-focus-within:opacity-100 transition-opacity">
                       <Check size={28} />
                    </div>
                 </div>
              </div>

              <div>
                 <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-[0.3em]">
                    Lớp phụ trách <span className="text-red-400">*</span>
                 </label>
                 <input 
                   required
                   type="text" 
                   placeholder="Ví dụ: 4A, 1/2..."
                   value={className}
                   onChange={(e) => setClassName(e.target.value)}
                   className="w-full p-6 text-xl rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-black text-gray-800 placeholder:text-gray-200"
                 />
              </div>

              <div>
                 <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-[0.3em]">
                    Đơn vị công tác <span className="text-red-400">*</span>
                 </label>
                 <input 
                   required
                   type="text" 
                   placeholder="Trường Tiểu học..."
                   value={school}
                   onChange={(e) => setSchool(e.target.value)}
                   className="w-full p-6 text-xl rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-black text-gray-800 placeholder:text-gray-200"
                 />
              </div>
           </div>

           <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-8 bg-chibi-orange text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-orange-200 flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all border-b-[12px] border-orange-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                 {loading ? (
                   <span className="flex items-center gap-3">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full" />
                      ĐANG XỬ LÝ...
                   </span>
                 ) : (
                   <><Check size={28} /> BẮT ĐẦU GIẢNG DẠY NGAY 🚀</>
                 )}
              </button>
              <p className="text-center text-gray-300 font-bold mt-6 text-sm uppercase tracking-widest">Dữ liệu được bảo mật bởi Học Liệu Số ✨</p>
           </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
