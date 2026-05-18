import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, where, doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, BookOpen, Star, Bell, Settings, LogOut, ChevronRight, 
  Play, Gamepad2, FileText, CheckCircle2, Trophy, Menu, X, 
  Layers, Sprout as MushroomIcon, Cloud, Sparkles, Send, Upload, File,
  Video, Monitor, ArrowLeft, Search, Calendar, BarChart3, Target, Info,
  Trophy as TrophyIcon, GraduationCap
} from 'lucide-react';
import { UserData } from '../App';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function StudentDashboard({ user, onLogout }: { user: UserData, onLogout?: () => void }) {
  const [topics, setTopics] = useState<any[]>([]);
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [myProgress, setMyProgress] = useState(0);
  const [detailedProgress, setDetailedProgress] = useState<any[]>([]);
  const [teacherData, setTeacherData] = useState<UserData | null>(null);

  const statsData = useMemo(() => {
    const total = materials.length || 1;
    const completed = detailedProgress.filter(p => p.completed).length;
    const items = [
      { name: 'Đã hoàn thành', value: completed, color: '#66BB6A' },
      { name: 'Chưa học', value: Math.max(0, total - completed), color: '#E5E7EB' }
    ];
    return { items, total, completed };
  }, [materials, detailedProgress]);

  const fetchTeacherData = () => {
    if (!user.teacherId) return () => {};
    try {
      return onSnapshot(doc(db, 'users', user.teacherId), (docSnap) => {
        if (docSnap.exists()) {
          setTeacherData(docSnap.data() as UserData);
        }
      });
    } catch (e) { 
      console.error(e);
      return () => {};
    }
  };

  useEffect(() => {
    fetchTopics();
    fetchSchedule();
    fetchMyProgress();
    
    let unsubscribeTeacher: () => void = () => {};
    if (user.teacherId) {
      unsubscribeTeacher = fetchTeacherData();
    }

    return () => {
      unsubscribeTeacher();
    };
  }, []);

  const fetchMyProgress = async () => {
    try {
      const materialsSnap = await getDocs(collection(db, 'materials'));
      const allMats = materialsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalMaterials = allMats.length || 1;

      const progressSnap = await getDocs(collection(db, `users/${user.uid}/progress`));
      const progList = progressSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const completedCount = progList.filter((d: any) => d.completed).length;
      
      setDetailedProgress(progList);
      setMyProgress(Math.round((completedCount / totalMaterials) * 100));
    } catch (e) { console.error(e); }
  };

  const fetchSchedule = async () => {
    if (!user.teacherId) return;
    try {
      const q = query(collection(db, 'schedules'), where('teacherId', '==', user.teacherId));
      const snap = await getDocs(q);
      setSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.time.localeCompare(b.time)));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (topics.length > 0 && !activeTopic) {
      setActiveTopic(topics[0]);
    }
  }, [topics]);

  useEffect(() => {
    if (activeTopic) {
      fetchCategories(activeTopic.id);
    }
  }, [activeTopic]);

  useEffect(() => {
    if (categories.length > 0) {
      // Fetch materials for all categories in this topic
      fetchAllMaterialsForTopic();
    } else {
      setMaterials([]);
    }
  }, [categories]);

  const fetchAllMaterialsForTopic = async () => {
    try {
      const allMatsMap = new Map();
      for (const cat of categories) {
        const q = query(collection(db, 'materials'), where('categoryId', '==', cat.id));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() };
          allMatsMap.set(d.id, data);
        });
      }
      const allMats = Array.from(allMatsMap.values());
      setMaterials(allMats.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (e) { console.error(e); }
  };

  const fetchTopics = async () => {
    try {
      const snap = await getDocs(collection(db, 'topics'));
      const topicList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Deduplicate by title
      const uniqueTopics = Array.from(new Map(topicList.map((item: any) => [item.title, item])).values());
      setTopics(uniqueTopics.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async (topicId: string) => {
    try {
      const q = query(collection(db, 'categories'), where('topicId', '==', topicId));
      const snap = await getDocs(q);
      const catList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Deduplicate by title
      const uniqueCats = Array.from(new Map(catList.map((item: any) => [item.title, item])).values());
      const sortedCats = uniqueCats.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCategories(sortedCats);
      if (sortedCats.length > 0) {
        setActiveCategory(sortedCats[0]);
      } else {
        setActiveCategory(null);
        setMaterials([]);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMaterials = async (categoryId: string) => {
    try {
      const q = query(collection(db, 'materials'), where('categoryId', '==', categoryId));
      const snap = await getDocs(q);
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (e) { console.error(e); }
  };

  const getEmbedUrl = (url: string, type: string) => {
    if (type === 'video') {
      const videoId = url.includes('v=') ? new URLSearchParams(new URL(url).search).get('v') : url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-[#FFF9F0] chibi-pattern">
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div animate={{ y: [0, -20, 0], x: [0, 30, 0] }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute top-10 left-[10%] opacity-20 transform scale-150 rotate-12">
          <img src="https://api.iconify.design/noto:cloud.svg" className="w-20" />
        </motion.div>
        <motion.div animate={{ y: [0, 20, 0], rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute bottom-10 right-[10%] opacity-20 transform scale-150">
          <img src="https://api.iconify.design/noto:sun.svg" className="w-24" />
        </motion.div>
        <motion.div animate={{ x: [0, 100, 0], y: [0, -40, 0] }} transition={{ repeat: Infinity, duration: 15 }} className="absolute top-1/4 right-[5%] opacity-20 transform rotate-45">
          <img src="https://api.iconify.design/noto:rocket.svg" className="w-16" />
        </motion.div>
        <motion.div animate={{ scale: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-1/3 left-1/4 text-4xl sparkle">✨</motion.div>
      </div>

      {/* Top Bar */}
      <header className="sticky top-0 z-50 p-4 sm:p-6 bg-white/95 backdrop-blur-xl border-b-4 border-white shadow-xl"
              style={{ borderBottomColor: user.themeColor || '#FFB300' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <motion.div 
               whileHover={{ rotate: [0, -10, 10, 0] }}
               className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 text-white"
               style={{ backgroundColor: user.themeColor || '#FFB300' }}
             >
               <GraduationCap className="w-7 h-7" />
             </motion.div>
             <div className="text-center md:text-left">
               <div className="flex items-center gap-2 mb-1">
                 <h1 className="font-black text-2xl text-gray-800 tracking-tight leading-none uppercase">Học Liệu Số</h1>
                 <span className="text-[8px] bg-chibi-pink text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Học Sinh</span>
               </div>
               <p className="text-[10px] px-2 py-0.5 rounded-full inline-block font-black uppercase tracking-[0.2em]"
                  style={{ backgroundColor: (user.themeColor || '#FFB300') + '20', color: user.themeColor || '#FFB300' }}>KHÔNG GIAN HỌC TẬP 🌟</p>
             </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 no-scrollbar max-w-full">
            <StudentNavItem 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
              sticker="https://api.iconify.design/noto:bar-chart.svg"
              label="Báo cáo" 
              themeColor={user.themeColor}
            />
            <StudentNavItem 
              active={activeTab === 'lessons'} 
              onClick={() => setActiveTab('lessons')} 
              sticker="https://api.iconify.design/noto:books.svg"
              label="Học bài" 
              themeColor={user.themeColor}
            />
            {schedule.length > 0 && (
              <StudentNavItem 
                active={activeTab === 'schedule'} 
                onClick={() => setActiveTab('schedule')} 
                sticker="https://api.iconify.design/noto:alarm-clock.svg"
                label="Lịch học" 
                themeColor={user.themeColor}
              />
            )}
            <StudentNavItem 
              active={activeTab === 'account'} 
              onClick={() => setActiveTab('account')} 
              sticker="https://api.iconify.design/noto:artist-palette.svg"
              label="Cá nhân" 
              themeColor={user.themeColor}
            />
            <div className="h-10 w-px bg-gray-100 mx-2 hidden sm:block" />
            
                <div className="flex items-center gap-4 bg-gray-50/50 p-2 rounded-2xl border-2 border-white shadow-inner">
               <div className="flex flex-col items-end hidden lg:flex">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Tiến độ của {user.name}</p>
                  <div className="w-32 h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${myProgress}%` }} className="h-full bg-chibi-green shadow-[0_0_10px_rgba(76,175,80,0.3)]" />
                  </div>
               </div>
               <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-xl hover:scale-105 transition-transform group cursor-pointer relative">
                  <img src={user.avatar || 'https://api.iconify.design/noto:egg.svg'} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                       onClick={onLogout || (() => auth.signOut())}>
                    <LogOut size={16} className="text-white" />
                  </div>
               </div>
            </div>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        {/* Main Learning Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-10 relative z-10">
          {activeTab === 'overview' ? (
             <div className="max-w-4xl mx-auto space-y-10">
                <div className="bg-white rounded-[4rem] p-12 shadow-sm border-2 border-gray-50 relative overflow-hidden">
                   <div className="flex flex-col md:flex-row items-center md:items-start gap-12 relative z-10">
                      <div className="w-48 h-48 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl bg-white shrink-0 relative">
                         <img src={user.avatar || 'https://api.iconify.design/noto:egg.svg'} className="w-full h-full object-cover" />
                         <div className="absolute top-2 right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                            <Star className="text-chibi-orange w-6 h-6 fill-chibi-orange" />
                         </div>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                         <h3 className="text-4xl font-black text-gray-800 tracking-tight mb-2 uppercase">CHÀO {user.name}! 🐻</h3>
                         <p className="text-gray-400 font-bold text-lg mb-8 leading-relaxed">Em đã sẵn sàng khám phá những bài học kì thú hôm nay chưa nào? ✨</p>
                         <div className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="px-4 py-2 bg-chibi-orange/10 text-chibi-orange rounded-xl font-black text-xs uppercase tracking-widest border border-chibi-orange/20">
                               ID: {user.username || user.uid}
                            </div>
                            <div className="px-4 py-2 bg-chibi-blue/10 text-chibi-blue rounded-xl font-black text-xs uppercase tracking-widest border border-chibi-blue/20">
                               LỚP: {user.classId || '4A'}
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-chibi-orange/5 rounded-full blur-3xl pointer-events-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border-2 border-gray-50">
                      <h4 className="font-black text-gray-800 text-xl mb-8 flex items-center gap-3">
                         <TrophyIcon className="text-chibi-orange" /> Biểu đồ học tập
                      </h4>
                      <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie
                                 data={statsData.items}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                                 dataKey="value"
                               >
                                 {statsData.items.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.color} />
                                 ))}
                               </Pie>
                               <Tooltip />
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-chibi-green" />
                            <span className="text-xs font-bold text-gray-400">Đã học</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-200" />
                            <span className="text-xs font-bold text-gray-400">Chưa học</span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border-2 border-gray-50 flex flex-col">
                      <h4 className="font-black text-gray-800 text-xl mb-8 flex items-center gap-3">
                         <Target className="text-chibi-blue" /> Đánh giá của Gấu 🐻
                      </h4>
                      <div className="flex-1 p-8 bg-chibi-blue/5 rounded-[2rem] border-2 border-white flex flex-col justify-center text-center">
                         <p className="text-lg font-bold text-gray-600 leading-relaxed italic">
                            "{myProgress >= 80 ? 'Oa!! Em học thật là xuất sắc! Tiếp tục phát huy thế mạnh này nhé, em sẽ sớm trở thành nhà khoa học nhí tài ba đấy! 🌟' : 
                              myProgress >= 50 ? 'Em đang làm rất tốt, chỉ cần cố gắng thêm một chút nữa thôi là em sẽ hoàn thành mục tiêu rồi. Gấu tin em làm được! 💪' : 
                              'Cố lên nào bạn nhỏ! Hãy dành thêm chút thời gian mỗi ngày để khám phá thế giới khoa học kì diệu cùng Gấu nhé! 📚'}"
                         </p>
                      </div>
                   </div>
                </div>
             </div>
          ) : activeTab === 'schedule' ? (
            <div className="max-w-4xl mx-auto space-y-10">
               <div className="bg-white rounded-[3rem] p-10 shadow-sm border-2 border-gray-50">
                  <h3 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-4 mb-10">
                     <Calendar className="text-chibi-pink w-10 h-10" /> Thời Khóa Biểu Của Lớp ⏰
                  </h3>
                  <div className="space-y-6">
                     {schedule.map((item) => (
                       <div key={item.id} className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 ${item.type === 'reminder' ? 'bg-pink-50/50 border-chibi-pink/10 shadow-sm' : 'bg-gray-50 border-transparent'}`}>
                          <span className={`text-sm font-black w-20 ${item.type === 'reminder' ? 'text-chibi-pink' : 'text-chibi-blue'}`}>{item.time}</span>
                          <div className={`w-1.5 h-10 rounded-full ${item.type === 'reminder' ? 'bg-chibi-pink/30' : 'bg-chibi-blue/30'}`} />
                          <div className="flex-1">
                             {item.type === 'reminder' && <p className="text-[10px] font-black text-chibi-pink uppercase tracking-widest leading-none mb-1">🔔 Lời nhắc từ thầy cô</p>}
                             <p className="text-xl font-black text-gray-800">{item.title}</p>
                          </div>
                          {item.type === 'reminder' && <div className="p-3 bg-white rounded-2xl shadow-sm text-chibi-pink"><Bell size={20} /></div>}
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          ) : activeTab === 'account' ? (
            <div className="max-w-4xl mx-auto space-y-10">
               <div className="bg-white rounded-[4rem] p-12 shadow-sm border-2 border-gray-50 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12 relative z-10">
                     <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl bg-white relative z-20">
                        <img src={user.avatar || 'https://api.iconify.design/noto:person.svg'} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 text-center md:text-left">
                        <h3 className="text-4xl font-black text-gray-800 tracking-tight mb-3">Tài khoản của em 🎨</h3>
                        <p className="text-gray-400 font-bold text-lg leading-relaxed">Em có thể tùy chỉnh màu sắc cho không gian học tập của riêng mình đấy!</p>
                     </div>
                  </div>

                  <div className="bg-gray-50 p-10 rounded-[3rem] border-2 border-gray-100/50 relative z-10">
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-6 ml-2 tracking-widest">Tùy chỉnh màu sắc yêu thích ✨</label>
                     <div className="flex flex-wrap gap-4 mb-10">
                        {['#FFB300', '#FF7043', '#66BB6A', '#42A5F5', '#AB47BC', '#EC407A', '#26A69A', '#78909C'].map(color => (
                          <button 
                            key={color}
                            onClick={() => {
                              setDoc(doc(db, 'users', user.uid), { themeColor: color }, { merge: true });
                              // Note: In a real app we'd trigger a reload or use a listener
                              alert('Đã đổi màu giao diện!');
                            }}
                            className={`w-14 h-14 rounded-2xl border-4 transition-all ${user.themeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <div className="flex items-center gap-3 ml-2">
                           <input 
                             type="color" 
                             value={user.themeColor || '#FFB300'}
                             onChange={(e) => setDoc(doc(db, 'users', user.uid), { themeColor: e.target.value }, { merge: true })}
                             className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-sm appearance-none p-0 overflow-hidden"
                           />
                        </div>
                     </div>
                     <p className="text-xs font-bold text-gray-400">Chọn một màu sắc em thích nhất để làm đẹp cho góc học tập nhé!</p>
                  </div>

                  <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-chibi-orange/5 rounded-full blur-3xl pointer-events-none" />
               </div>
            </div>
          ) : selectedMaterial ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <button 
                onClick={() => setSelectedMaterial(null)}
                className="flex items-center gap-3 text-gray-400 font-bold hover:text-chibi-orange transition-all mb-8 group"
              >
                <div className="w-10 h-10 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center group-hover:border-chibi-orange group-hover:bg-chibi-orange/5 transition-all shadow-sm">
                   <ChevronRight className="w-5 h-5 rotate-180" />
                </div>
                <span>Quay lại thư viện</span>
              </button>

              <div className="card-chibi p-0 overflow-hidden mb-10 border-none shadow-2xl">
                 <div className="p-8 bg-white border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                       <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] bg-chibi-blue/20 text-chibi-blue px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{activeTopic?.title}</span>
                          <span className="text-[10px] bg-chibi-orange/20 text-orange-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{selectedMaterial.type}</span>
                       </div>
                       <h2 className="text-4xl font-black text-gray-800 tracking-tight">{selectedMaterial.title}</h2>
                    </div>
                    <div className="flex-1 md:max-w-xs w-full">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Hành trình của em ✨</span>
                          <span className="text-[10px] font-black text-chibi-green uppercase tracking-widest leading-none">{myProgress}%</span>
                       </div>
                       <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${myProgress}%` }} 
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-chibi-green shadow-[0_0_15px_rgba(76,175,80,0.4)]" 
                          />
                       </div>
                    </div>
                    <div className="flex gap-3">
                       <button className="btn-chibi bg-chibi-orange text-white border-chibi-orange/50 text-sm">XEM TOÀN MÀN HÌNH 🖥️</button>
                    </div>
                 </div>

                 <div className="aspect-video w-full bg-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
                    <iframe 
                      className="w-full h-full" 
                      src={getEmbedUrl(selectedMaterial.url, selectedMaterial.type)}
                      title={selectedMaterial.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                 </div>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-7xl mx-auto flex flex-col h-full">
               {/* Horizontal Topic Navigation */}
               <div className="flex items-center gap-4 bg-white p-4 rounded-[2.5rem] shadow-sm border-2 border-gray-50 overflow-x-auto scrollbar-hide shrink-0 mb-10">
                  <div className="flex items-center gap-3 px-6 border-r-2 border-gray-100 mr-2 shrink-0">
                     <BookOpen size={20} className="text-chibi-orange" />
                     <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Chủ đề:</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pr-4">
                     {topics.map(topic => (
                       <motion.button 
                         key={topic.id}
                         whileHover={{ scale: 1.05, y: -5 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => setActiveTopic(topic)}
                         className={`flex-shrink-0 px-8 py-4 rounded-2xl font-black text-sm tracking-tight transition-all flex items-center gap-3 relative overflow-hidden ${
                           activeTopic?.id === topic.id 
                             ? 'text-white shadow-lg scale-105 z-10' 
                             : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                         }`}
                         style={{ 
                           backgroundColor: activeTopic?.id === topic.id ? (topic.color || '#FFB300') : undefined,
                           boxShadow: activeTopic?.id === topic.id ? `0 10px 20px ${topic.color || '#FFB300'}40` : undefined
                         }}
                       >
                          <span className="text-xl">{topic.icon}</span>
                          {topic.title}
                          {activeTopic?.id === topic.id && (
                            <motion.div layoutId="topic-active" className="absolute inset-0 bg-white/10" />
                          )}
                       </motion.button>
                     ))}
                  </div>
               </div>

               {/* Materials Grid */}
               <div className="flex-1 bg-white rounded-[4rem] p-8 lg:p-12 shadow-sm border-2 border-gray-50 overflow-y-auto scrollbar-hide relative min-h-0">
                  {activeTopic ? (
                    <div className="space-y-12">
                      <div className="flex justify-between items-center bg-gray-50/50 p-8 rounded-[3rem] border-2 border-white shadow-sm">
                         <h3 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-4">
                            <span className="text-5xl">{activeTopic.icon}</span> 
                            <div>
                               <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">ĐANG KHÁM PHÁ</span>
                               {activeTopic.title}
                            </div>
                         </h3>
                         <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: activeTopic.color || '#FFB300' }}>
                           <BookOpen size={30} />
                         </div>
                      </div>

                      {categories.map(category => (
                        <div key={category.id} className="space-y-6">
                           <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 rounded-2xl border-l-8" style={{ borderColor: activeTopic.color || '#FFB300' }}>
                              <Layers size={18} className="text-gray-400" />
                              <h5 className="font-black text-gray-700 text-sm uppercase tracking-widest">{category.title}</h5>
                           </div>
                           
                           <div className="space-y-3 px-2">
                             {materials.filter(m => m.categoryId === category.id).map((mat, i) => {
                               const isCompleted = detailedProgress.some(p => p.id === mat.id && p.completed);
                               return (
                               <motion.div 
                                 key={mat.id}
                                 whileHover={{ x: 10 }}
                                 onClick={() => {
                                   setSelectedMaterial(mat);
                                   setDoc(doc(db, `users/${user.uid}/progress`, mat.id), {
                                     completed: true,
                                     updatedAt: serverTimestamp()
                                   }, { merge: true }).then(() => fetchMyProgress());
                                 }}
                                 className="group bg-white rounded-2xl p-4 border-2 border-gray-50 hover:border-chibi-orange hover:shadow-lg transition-all cursor-pointer flex items-center justify-between gap-4"
                               >
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ${
                                        mat.type === 'video' ? 'bg-red-50 text-red-500' :
                                        mat.type === 'game' ? 'bg-purple-50 text-purple-500' :
                                        mat.type === 'pdf' ? 'bg-orange-50 text-orange-500' :
                                        'bg-blue-50 text-blue-500'
                                     }`}>
                                        {mat.type === 'video' ? <Video size={20} /> : 
                                         mat.type === 'game' ? <Gamepad2 size={20} /> : 
                                         mat.type === 'pdf' ? <FileText size={20} /> : 
                                         <BookOpen size={20} />}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-gray-800 truncate text-base">{mat.title}</h4>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">
                                            {mat.type}
                                          </span>
                                          {isCompleted && (
                                            <span className="text-[8px] font-black text-chibi-green uppercase tracking-widest bg-chibi-green/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                              <CheckCircle2 size={8} /> ĐÃ HOÀN THÀNH
                                            </span>
                                          )}
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <button className="px-6 py-2 bg-gray-50 group-hover:bg-chibi-orange group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        VÀO HỌC 🚀
                                     </button>
                                     <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-chibi-orange group-hover:bg-white transition-all shadow-sm border border-transparent group-hover:border-chibi-orange/10">
                                        <ChevronRight size={18} />
                                     </div>
                                  </div>
                               </motion.div>
                               );
                             })}
                           </div>
                           

                           
                           {materials.filter(m => m.categoryId === category.id).length === 0 && (
                             <div className="py-4 px-6 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 text-center">
                               <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Đang chuẩn bị nội dung... ✨</p>
                             </div>
                           )}
                        </div>
                      ))}

                      {categories.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center justify-center gap-6 opacity-30">
                           <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                              <Monitor size={48} className="text-gray-300" />
                           </div>
                           <p className="text-2xl font-black text-gray-300 uppercase tracking-widest">Đang tải học bài... ✨</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-30">
                       <img src="https://api.iconify.design/noto:thinking-face.svg" className="w-32 mb-8 grayscale" />
                       <h3 className="text-3xl font-black text-gray-300 uppercase tracking-[0.3em] leading-relaxed">Hãy chọn một chủ đề <br /> để bắt đầu học nhé! 🌟</h3>
                    </div>
                  )}

                  {/* BG Decor */}
                  <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-chibi-orange/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-chibi-blue/5 rounded-full blur-3xl pointer-events-none" />
               </div>
            </div>
          )}
        </main>


        {/* Background Decor Effects */}
      </div>
    </div>
  );
}

function StudentNavItem({ sticker, label, active, onClick, themeColor }: any) {
  return (
    <motion.button 
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-[1.5rem] font-black text-xs transition-all group relative overflow-hidden border-2 border-white shadow-xl ${
        active 
          ? 'text-white border-b-6 translate-y-[-2px]' 
          : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 border-b-6 border-b-gray-100 hover:border-b-gray-200 active:border-b-0'
      }`}
      style={{ 
        backgroundColor: active ? (themeColor || '#FFB300') : undefined,
        borderColor: active ? undefined : 'white',
        borderBottomColor: active ? 'rgba(0,0,0,0.2)' : undefined,
      }}
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300 group-hover:rotate-12 ${active ? 'scale-110' : ''}`}>
        <img src={sticker} className="w-full h-full object-contain" />
      </div>
      <span className="tracking-tight uppercase whitespace-nowrap">{label}</span>
      {active && (
        <motion.div 
          layoutId="studentNavActiveLine"
          className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" 
        />
      )}
    </motion.button>
  );
}

