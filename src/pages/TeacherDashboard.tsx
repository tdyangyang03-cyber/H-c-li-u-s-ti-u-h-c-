import { useState, useEffect, useMemo } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, BookOpen, Plus, Trash2, LogOut, ChevronRight, 
  Video, Gamepad2, FileText, Download, LayoutDashboard, 
  Settings, Bell, CheckCircle2, Clock, Calendar, BarChart3,
  Search, Filter, Sparkles, Star, Trophy, ArrowLeft, X, Check,
  Target, Info, RefreshCw
} from 'lucide-react';
import { UserData } from '../App';
import * as XLSX from 'xlsx';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

export default function TeacherDashboard({ user, onLogout }: { user: UserData, onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [topics, setTopics] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', code: '', password: '' });

  // Teacher Profile state
  const [teacherProfile, setTeacherProfile] = useState({
    name: user.name || '',
    school: user.school || '',
    grade: user.classId || '',
    bio: user.bio || '',
    phone: user.phone || '',
    themeColor: user.themeColor || '#FFB300',
    avatar: user.avatar || 'https://api.iconify.design/noto:teacher.svg'
  });

  // Navigation state for Library
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newMaterial, setNewMaterial] = useState({ title: '', type: 'elearning', url: '' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    type: 'topic' | 'category' | 'material' | 'student';
    title: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);
  const [studentProgressList, setStudentProgressList] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  // Management Mode States
  const [manageTopics, setManageTopics] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);
  const [manageMaterials, setManageMaterials] = useState(false);
  const [manageStudents, setManageStudents] = useState(false);
  const [showStatsReport, setShowStatsReport] = useState<string | null>(null);

  const [classProgress, setClassProgress] = useState<Record<string, number>>({});

  const statsData = useMemo(() => {
    const studentCount = students.length;
    const materialCount = allMaterials.length;
    const totalProgress = Object.values(classProgress).reduce((a, b) => a + b, 0);
    const avgProgress = studentCount > 0 ? Math.round(totalProgress / studentCount) : 0;
    
    // Data for charts
    const progressDistribution = [
      { name: 'Hoàn thành (80-100%)', count: Object.values(classProgress).filter(p => p >= 80).length, color: '#66BB6A' },
      { name: 'Đang học (50-79%)', count: Object.values(classProgress).filter(p => p >= 50 && p < 80).length, color: '#42A5F5' },
      { name: 'Chậm tiến độ (<50%)', count: Object.values(classProgress).filter(p => p < 50).length, color: '#FF7043' },
    ];

      const studentProgressData = students.map(s => ({
      id: s.id,
      name: s.name.split(' ').pop(),
      tiến_độ: classProgress[s.id] || 0
    }));

    return {
      studentCount,
      materialCount,
      avgProgress,
      progressDistribution,
      studentProgressData
    };
  }, [students, allMaterials, classProgress]);
  const standardTopics = [
    { title: 'CHẤT', icon: '🧪', order: 1, color: '#FFB300' },
    { title: 'NĂNG LƯỢNG', icon: '⚡', order: 2, color: '#FF7043' },
    { title: 'THỰC VẬT VÀ ĐỘNG VẬT', icon: '🌱', order: 3, color: '#66BB6A' },
    { title: 'NẤM', icon: '🍄', order: 4, color: '#AB47BC' },
    { title: 'CON NGƯỜI VÀ SỨC KHỎE', icon: '🧍', order: 5, color: '#42A5F5' },
    { title: 'SINH VẬT VÀ MÔI TRƯỜNG', icon: '🌍', order: 6, color: '#26A69A' },
  ];

  useEffect(() => {
    if (selectedTopic) {
      fetchCategories(selectedTopic.id);
    }
  }, [selectedTopic]);

  useEffect(() => {
    if (selectedCategory) {
      fetchMaterials(selectedCategory.id);
    }
  }, [selectedCategory]);

  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', icon: '🧪', color: '#FFB300' });

  const fetchStudentDetail = async (student: any) => {
    setSelectedStudentDetail(student);
    try {
      // Fetch all student progress
      const q = query(collection(db, `users/${student.id}/progress`));
      const snap = await getDocs(q);
      setStudentProgressList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // Fetch all materials to display names if not already fetched
      if (allMaterials.length === 0) {
        const matSnap = await getDocs(collection(db, 'materials'));
        setAllMaterials(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${student.id}/progress`);
    }
  };

  const fetchTopics = async () => {
    try {
      const snap = await getDocs(collection(db, 'topics'));
      let topicList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Seed if empty
      if (topicList.length === 0) {
        for (const t of standardTopics) {
          await addDoc(collection(db, 'topics'), { ...t, createdAt: serverTimestamp() });
        }
        const snapNew = await getDocs(collection(db, 'topics'));
        topicList = snapNew.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      // Deduplicate by title to clean up duplicates
      const uniqueList = Array.from(new Map(topicList.map((item: any) => [item.title, item])).values());
      setTopics(uniqueList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async (topicId: string) => {
    try {
      const q = query(collection(db, 'categories'), where('topicId', '==', topicId));
      const snap = await getDocs(q);
      const catList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Deduplicate categories by title
      const uniqueCats = Array.from(new Map(catList.map((item: any) => [item.title, item])).values());
      setCategories(uniqueCats.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (e) { console.error(e); }
  };

  const fetchMaterials = async (categoryId: string) => {
    try {
      const q = query(collection(db, 'materials'), where('categoryId', '==', categoryId));
      const snap = await getDocs(q);
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (e) { console.error(e); }
  };

  const addCategory = async () => {
    if (!newCategoryTitle || !selectedTopic) return;
    const path = 'categories';
    try {
      await addDoc(collection(db, path), {
        topicId: selectedTopic.id,
        title: newCategoryTitle,
        order: categories.length + 1,
        createdAt: serverTimestamp()
      });
      setNewCategoryTitle('');
      setShowAddCategory(false);
      fetchCategories(selectedTopic.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const addMaterial = async () => {
    if (!newMaterial.title || !newMaterial.url || !selectedCategory) return;
    const path = 'materials';
    try {
      await addDoc(collection(db, path), {
        categoryId: selectedCategory.id,
        ...newMaterial,
        order: materials.length + 1,
        createdAt: serverTimestamp()
      });
      setNewMaterial({ title: '', type: 'elearning', url: '' });
      setShowAddMaterial(false);
      fetchMaterials(selectedCategory.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const addTopic = async () => {
    if (!newTopic.title) return;
    const path = 'topics';
    try {
      await addDoc(collection(db, path), {
        ...newTopic,
        order: topics.length + 1,
        createdAt: serverTimestamp()
      });
      setNewTopic({ title: '', icon: '🧪', color: '#FFB300' });
      setShowAddTopic(false);
      fetchTopics();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateTopicColor = async (topicId: string, color: string) => {
    try {
      await setDoc(doc(db, 'topics', topicId), { color }, { merge: true });
      fetchTopics();
    } catch (e) { console.error(e); }
  };

  const fetchClassProgress = async () => {
    try {
      const progressMap: Record<string, number> = {};
      // Fetch total materials count to calculate percentage
      const materialsSnap = await getDocs(collection(db, 'materials'));
      const totalMaterials = materialsSnap.size || 1;

      for (const student of students) {
        const q = query(collection(db, `users/${student.id}/progress`));
        const progressSnap = await getDocs(q);
        const completedCount = progressSnap.docs.filter(d => d.data().completed).length;
        progressMap[student.id] = Math.round((completedCount / totalMaterials) * 100);
      }
      setClassProgress(progressMap);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (students.length > 0) {
      fetchClassProgress();
    }
  }, [students]);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
       console.error(e);
    }
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In a real app, we might want to use a cloud function to create the auth user
      // But here we can just create the document and tell the student to login with code
      // We will also use the code as 'username' in our future Login logic
      const studentId = `student_${Date.now()}`;
      await setDoc(doc(db, 'users', studentId), {
        uid: studentId,
        name: newStudent.name,
        username: newStudent.code,
        password: newStudent.password, // In a real app, never store plain text passwords!
        role: 'student',
        classId: user.classId || '4A',
        teacherId: user.uid,
        createdAt: serverTimestamp(),
        avatar: `https://api.iconify.design/noto:egg.svg`
      });
      setShowAddStudent(false);
      setNewStudent({ name: '', code: '', password: '' });
      fetchStudents();
      alert('Đã tạo tài khoản học sinh thành công!');
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tạo học sinh!');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        ...teacherProfile,
        name: teacherProfile.name,
        classId: teacherProfile.grade,
        themeColor: teacherProfile.themeColor,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Cập nhật thông tin thành công!');
    } catch (e) {
      console.error(e);
      alert('Lỗi cập nhật!');
    } finally {
      setLoading(false);
    }
  };

  const addSchedule = async () => {
    const title = prompt('Nhập tên tiết học hoặc nhắc hẹn:');
    const time = prompt('Nhập thời gian (VD: 08:00):');
    const isReminder = confirm('Đây có phải là lời nhắc hẹn học bài cho học sinh không?');
    
    if (!title || !time) return;
    
    try {
      await addDoc(collection(db, 'schedules'), {
        title,
        time,
        type: isReminder ? 'reminder' : 'lesson',
        classId: user.classId || '4A',
        teacherId: user.uid,
        active: schedule.length === 0,
        createdAt: serverTimestamp()
      });
      fetchSchedule();
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu lịch trình!');
    }
  };

  const deleteTopic = async (id: string) => {
    const path = `topics/${id}`;
    try {
      await deleteDoc(doc(db, 'topics', id));
      fetchTopics();
      // No alert needed if feedback is visual, but custom modal handles it
    } catch (e) { 
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const deleteMaterial = async (id: string) => {
    const path = `materials/${id}`;
    try {
      await deleteDoc(doc(db, 'materials', id));
      if (selectedCategory) fetchMaterials(selectedCategory.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const deleteStudent = async (id: string) => {
    const path = `users/${id}`;
    try {
      await deleteDoc(doc(db, 'users', id));
      fetchStudents();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const deleteSchedule = async (id: string) => {
    const path = `schedules/${id}`;
    try {
      await deleteDoc(doc(db, 'schedules', id));
      fetchSchedule();
    } catch (e) { 
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const [allStudentsProgress, setAllStudentsProgress] = useState<any[]>([]);
  const fetchAllDetailedProgress = async () => {
    const allProj: any[] = [];
    for (const s of students) {
      const q = query(collection(db, `users/${s.id}/progress`));
      const snap = await getDocs(q);
      allProj.push({ id: s.id, name: s.name, progress: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    setAllStudentsProgress(allProj);
  };

  useEffect(() => {
    if (showStatsReport === 'progress') {
      fetchAllDetailedProgress();
    }
  }, [showStatsReport]);

  const fetchSchedule = async () => {
    const path = 'schedules';
    try {
      const q = query(collection(db, path), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      setSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.time.localeCompare(b.time)));
    } catch (e) { 
      handleFirestoreError(e, OperationType.GET, path);
    }
  };

  const fetchMaterialTypes = async () => {
    const path = 'material_types';
    try {
      const snap = await getDocs(collection(db, path));
      let types = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (types.length === 0) {
        const initialTypes = [
          { title: 'Bài giảng eLearning', value: 'elearning' },
          { title: 'Canva / Genially', value: 'canva' },
          { title: 'Google Slides / PPT', value: 'slides' },
          { title: 'Video (YouTube/AI)', value: 'video' },
          { title: 'Tài liệu PDF / Hình ảnh', value: 'pdf' },
          { title: 'Trò chơi (Wordwall/Quizizz)', value: 'game' },
          { title: 'Góc khám phá', value: 'discovery' },
        ];
        for (const t of initialTypes) {
          await addDoc(collection(db, path), t);
        }
        const snapNew = await getDocs(collection(db, path));
        types = snapNew.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      // Deduplicate by value
      const uniqueTypes = Array.from(new Map(types.map((item: any) => [item.value, item])).values());
      setMaterialTypes(uniqueTypes);
    } catch (e) { 
      handleFirestoreError(e, OperationType.GET, path);
    }
  };

  const addMaterialType = async () => {
    if (!newTypeName.trim()) return;
    const path = 'material_types';
    try {
      await addDoc(collection(db, path), {
        title: newTypeName,
        value: newTypeName.toLowerCase().replace(/\s+/g, '_')
      });
      setNewTypeName('');
      setShowAddType(false);
      fetchMaterialTypes();
    } catch (e) { 
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const deleteMaterialType = async (id: string) => {
    const path = `material_types/${id}`;
    try {
      await deleteDoc(doc(db, 'material_types', id));
      fetchMaterialTypes();
    } catch (e) { 
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  useEffect(() => {
    fetchTopics();
    fetchStudents();
    fetchSchedule();
    fetchMaterialTypes();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col font-sans relative overflow-hidden chibi-pattern" 
         style={{ '--theme-color': teacherProfile.themeColor || '#FFB300' } as any}>
      
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0], rotate: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
          className="absolute top-20 left-[10%] w-32 h-32 bg-chibi-orange/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 60, 0], rotate: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute top-1/2 right-[5%] w-48 h-48 bg-chibi-blue/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ y: [0, -100, 0], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute bottom-20 left-[20%] w-64 h-64 bg-chibi-pink/10 rounded-full blur-3xl"
        />
        
        {/* Decorative Icons */}
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-10 left-[15%] opacity-20 transform scale-150 rotate-12">
          <img src="https://api.iconify.design/noto:cloud.svg" className="w-20" />
        </motion.div>
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute bottom-20 right-[15%] opacity-20 transform scale-150">
          <img src="https://api.iconify.design/noto:sun.svg" className="w-24" />
        </motion.div>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 30, ease: "linear" }} className="absolute top-1/3 left-[5%] opacity-10 transform -rotate-45">
          <img src="https://api.iconify.design/noto:sparkles.svg" className="w-16" />
        </motion.div>
        <motion.div animate={{ scale: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-1/4 right-1/4 text-4xl sparkle">⭐</motion.div>
      </div>

      {/* Top Header & Navigation */}
      <header className="sticky top-0 z-50 p-4 sm:p-6 bg-[#FFF9F0]/80 backdrop-blur-xl border-b-4 border-white/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-100 transform -rotate-3 transition-transform hover:rotate-0 cursor-default border-4 border-white overflow-hidden"
                  style={{ backgroundColor: teacherProfile.themeColor || '#FFB300' }}>
                <img src={teacherProfile.avatar} className="w-full h-full object-cover" />
             </div>
             <div>
                <h1 className="font-black text-2xl text-gray-800 tracking-tight leading-none mb-1 uppercase uppercase">{teacherProfile.name || 'GIÁO VIÊN'}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: teacherProfile.themeColor || '#FFB300' }}>Trang điều chỉnh bài giảng • 2026</p>
             </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 no-scrollbar max-w-full">
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
              sticker="https://api.iconify.design/noto:house.svg"
              label="Tổng quan" 
              themeColor={teacherProfile.themeColor}
            />
            <NavItem 
              active={activeTab === 'classes'} 
              onClick={() => setActiveTab('classes')} 
              sticker="https://api.iconify.design/noto:backpack.svg"
              label="Lớp học" 
              themeColor={teacherProfile.themeColor}
            />
            <NavItem 
              active={activeTab === 'lessons'} 
              onClick={() => setActiveTab('lessons')} 
              sticker="https://api.iconify.design/noto:books.svg"
              label="Học liệu" 
              themeColor={teacherProfile.themeColor}
            />
            <NavItem 
              active={activeTab === 'schedule'} 
              onClick={() => setActiveTab('schedule')} 
              sticker="https://api.iconify.design/noto:alarm-clock.svg"
              label="Lịch dạy" 
              themeColor={teacherProfile.themeColor}
            />
            <NavItem 
              active={activeTab === 'account'} 
              onClick={() => setActiveTab('account')} 
              sticker="https://api.iconify.design/noto:artist-palette.svg"
              label="Cá nhân" 
              themeColor={teacherProfile.themeColor}
            />
            <div className="h-10 w-px bg-gray-200/50 mx-2 hidden sm:block" />
            <button 
              onClick={onLogout || (() => signOut(auth))}
              className="px-6 py-4 bg-white text-red-500 rounded-2xl text-[10px] font-black hover:bg-red-50 transition-all border-b-4 border-gray-100 active:translate-y-1 active:border-b-0 whitespace-nowrap"
            >
              THOÁT
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-10 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-8 text-center sm:text-left">
          <div>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-800 tracking-tight mb-3 transition-all">Chào Thầy/Cô {teacherProfile.name?.split(' ').pop() || '👋'}! 🐻</h2>
            <p className="text-gray-400 font-bold text-lg sm:text-xl">Hôm nay Thầy/Cô muốn chuẩn bị điều gì cho các bạn nhỏ? ✨</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden lg:flex bg-white p-4 rounded-3xl shadow-sm border-2 border-white flex items-center gap-3 px-8 transition-all focus-within:shadow-xl focus-within:scale-105">
                <Search size={22} className="text-gray-400" />
                <input type="text" placeholder="Tìm kiếm nhanh..." className="bg-transparent border-none outline-none text-sm font-bold text-gray-600 w-48" />
             </div>
             <button className="p-4 sm:p-5 bg-white rounded-3xl shadow-sm border-2 border-white text-gray-400 hover:text-chibi-orange transition-all relative group hover:scale-110 active:scale-95 shadow-xl shadow-orange-50/50">
                <Bell size={28} />
                <span className="absolute top-5 right-5 w-3 h-3 bg-chibi-orange rounded-full border-4 border-white animate-pulse"></span>
             </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-10 relative z-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <StatCard 
                  icon={<Users size={28} className="text-chibi-blue" />} 
                  label="Học sinh" 
                  value={statsData.studentCount.toString()} 
                  color="bg-chibi-blue/15" 
                  onClick={() => setShowStatsReport('students')}
                />
                <StatCard 
                  icon={<BookOpen size={28} className="text-chibi-orange" />} 
                  label="Bài học" 
                  value={statsData.materialCount.toString()} 
                  color="bg-chibi-orange/15" 
                  onClick={() => setShowStatsReport('lessons')}
                />
                <StatCard 
                  icon={<CheckCircle2 size={28} className="text-chibi-green" />} 
                  label="Hoàn thành TB" 
                  value={`${statsData.avgProgress}%`} 
                  color="bg-chibi-green/15" 
                  onClick={() => setShowStatsReport('progress')}
                />
              </div>

              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-10">
                   {/* Progress Chart */}
                   <div className="bg-white rounded-[3rem] p-10 shadow-sm border-2 border-gray-50">
                      <div className="flex justify-between items-center mb-10">
                         <h3 className="font-black text-gray-800 text-2xl flex items-center gap-3">
                            <BarChart3 className="text-chibi-orange w-8 h-8" /> Biểu đồ tiến độ lớp {user.classId || '4A'}
                         </h3>
                         <button 
                          onClick={() => fetchClassProgress()}
                          className="text-xs font-black text-chibi-blue uppercase tracking-widest bg-chibi-blue/5 px-6 py-3 rounded-2xl border-2 border-gray-100 flex items-center gap-2 hover:bg-chibi-blue/10 transition-all"
                         >
                            <RefreshCw size={14} /> Làm mới số liệu
                         </button>
                      </div>
                      
                      {students.length > 0 ? (
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statsData.studentProgressData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F2" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }} domain={[0, 100]} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                cursor={{ fill: '#F9FAFB', radius: 10 }}
                              />
                              <Bar dataKey="tiến_độ" fill={teacherProfile.themeColor || '#FFB300'} radius={[10, 10, 0, 0]} barSize={40}>
                                {statsData.studentProgressData.map((entry, index) => (
                                  <Cell key={`cell-${entry.id}`} fill={teacherProfile.themeColor || '#FFB300'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-72 bg-gray-50/50 rounded-[2.5rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4">
                           <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 4 }}>
                              <img src="https://api.iconify.design/noto:rocket.svg" className="w-16 h-16 opacity-30" />
                           </motion.div>
                           <p className="text-gray-300 font-black uppercase tracking-widest text-sm max-w-sm text-center">Bắt đầu cập nhật danh sách học sinh để xem dữ liệu tiến độ thực tế 🚀</p>
                        </div>
                      )}
                   </div>

                   {/* Recent Activity - Only if students exist and satisfy condition */}
                   {students.length > 0 && (
                     <div className="bg-white rounded-[3rem] p-10 shadow-sm border-2 border-gray-50">
                        <div className="flex justify-between items-center mb-8">
                           <h3 className="font-black text-gray-800 text-2xl">Hoạt động mới nhất ⚡</h3>
                           <button className="text-xs font-black text-chibi-blue hover:underline tracking-widest uppercase bg-chibi-blue/5 px-4 py-2 rounded-xl">Xem tất cả</button>
                        </div>
                        <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
                           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <Bell className="w-8 h-8 text-gray-200" />
                           </div>
                           <p className="font-black text-xs uppercase tracking-widest">Chưa có hoạt động mới từ học sinh</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-10 relative z-10">
             <div className="bg-white rounded-[3rem] p-10 shadow-sm border-2 border-gray-50">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <h3 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-4">
                         <Calendar className="text-chibi-pink w-10 h-10" /> Quản Lý Lịch Học ⏰
                      </h3>
                      <p className="text-gray-400 font-bold mt-2">Xây dựng lộ trình học tập và quản lý học liệu số.</p>
                   </div>
                   <button 
                    onClick={addSchedule}
                    className="px-8 py-5 bg-chibi-pink text-white rounded-[2rem] font-black shadow-xl shadow-pink-100 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border-b-8 border-pink-700"
                   >
                     <Plus size={22} /> TẠO TIẾT HỌC MỚI
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {schedule.map((item) => (
                       <ScheduleItem 
                         key={item.id} 
                         time={item.time} 
                         title={item.title} 
                         active={item.active} 
                         onDelete={() => setDeleteConfirmation({
                           id: item.id,
                           type: 'material', // Reusing type for UI simplicity or could add 'schedule'
                           title: item.title,
                           onConfirm: () => deleteSchedule(item.id)
                         })}
                       />
                    ))}
                   {schedule.length === 0 && (
                      <div className="col-span-full py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-6">
                         <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Clock className="w-12 h-12 text-gray-200" />
                         </div>
                         <div className="text-center">
                            <p className="text-2xl font-black text-gray-300 uppercase tracking-widest mb-2">Chưa có chương trình học ✨</p>
                            <p className="text-gray-400 font-bold">Thầy/Cô hãy bắt đầu tạo tiết học đầu tiên cho học sinh nhé!</p>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-10 relative z-10 max-w-4xl mx-auto">
             <div className="bg-white rounded-[4rem] p-12 shadow-sm border-2 border-gray-50 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12 relative z-10">
                   <div className="relative group">
                      <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl bg-white relative z-20 transition-transform group-hover:scale-105 duration-500">
                         <img src={teacherProfile.avatar} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-chibi-orange rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white z-30 transform rotate-12 group-hover:rotate-0 transition-transform">
                         <Plus size={24} />
                      </div>
                      <div className="absolute inset-0 bg-chibi-orange/20 rounded-[3rem] blur-3xl opacity-50 -z-10 animate-pulse" />
                   </div>
                   
                   <div className="flex-1 text-center md:text-left">
                      <h3 className="text-4xl font-black text-gray-800 tracking-tight mb-3">Thông tin hồ sơ 🎨</h3>
                      <p className="text-gray-400 font-bold text-lg leading-relaxed mb-6">Điều chỉnh thông tin cá nhân và thông điệp gửi tới các bạn nhỏ của lớp mình Thầy/Cô nhé!</p>
                      <div className="flex flex-wrap gap-3">
                         {['teacher', 'man-teacher', 'woman-teacher', 'person-fencing', 'person-biking', 'scientist'].map(ico => {
                           const url = `https://api.iconify.design/noto:${ico}.svg`;
                           return (
                             <button 
                               key={ico}
                               onClick={() => setTeacherProfile({...teacherProfile, avatar: url})}
                               className={`w-12 h-12 rounded-xl border-4 transition-all ${teacherProfile.avatar === url ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                               style={{ backgroundColor: teacherProfile.avatar === url ? (teacherProfile.themeColor || '#FFB300') : '#F3F4F6' }}
                             >
                               <img src={url} className="w-full h-full p-2" />
                             </button>
                           );
                         })}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Họ và Tên 🖊️</label>
                      <input 
                        type="text"
                        value={teacherProfile.name}
                        onChange={(e) => setTeacherProfile({...teacherProfile, name: e.target.value})}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold placeholder:text-gray-300"
                        placeholder="VD: Thầy Nguyễn Văn An"
                      />
                   </div>
                   <ProfileField label="Email đăng nhập" value={user.email} disabled />
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Trường học 🏛️</label>
                      <input 
                        type="text"
                        value={teacherProfile.school}
                        onChange={(e) => setTeacherProfile({...teacherProfile, school: e.target.value})}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold placeholder:text-gray-300"
                        placeholder="VD: Tiểu học Chu Văn An"
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Khối lớp giảng dạy 🎒</label>
                      <input 
                        type="text"
                        value={teacherProfile.grade}
                        onChange={(e) => setTeacherProfile({...teacherProfile, grade: e.target.value})}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold placeholder:text-gray-300"
                        placeholder="VD: Khối 4"
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Lời nhắn gửi đến học sinh 🐻</label>
                      <textarea 
                        rows={4}
                        value={teacherProfile.bio}
                        onChange={(e) => setTeacherProfile({...teacherProfile, bio: e.target.value})}
                        className="w-full p-6 rounded-3xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold placeholder:text-gray-300 resize-none"
                        placeholder="VD: Chào các em học sinh thân yêu! Chúc các em có những giờ học Khoa học thật thú vị..."
                      />
                   </div>
                   <div className="md:col-span-2 bg-gray-50/50 p-8 rounded-[3rem] border-4 border-dashed border-gray-100">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Giao diện cá nhân 🎨</label>
                      <div className="flex flex-col sm:flex-row items-center gap-8">
                         <div className="flex flex-col gap-2">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-tight ml-1">Màu chủ đạo</div>
                            <div className="flex items-center gap-3">
                               <input 
                                 type="color" 
                                 value={teacherProfile.themeColor}
                                 onChange={(e) => setTeacherProfile({...teacherProfile, themeColor: e.target.value})}
                                 className="w-16 h-16 rounded-2xl cursor-pointer border-4 border-white shadow-xl appearance-none p-0 overflow-hidden transition-transform hover:scale-110 active:scale-95"
                               />
                               <div className="p-4 rounded-2xl bg-white border-2 border-gray-100 font-mono text-sm font-black uppercase text-gray-400">
                                  {teacherProfile.themeColor}
                               </div>
                            </div>
                         </div>
                         <div className="flex-1">
                            <p className="text-xs font-bold text-gray-400 leading-relaxed max-w-sm">Chọn màu sắc đại diện cho lớp học của Thầy/Cô. Màu này sẽ được áp dụng cho toàn bộ giao diện điều khiển và các nút bấm chính.</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-12 flex justify-center sticky bottom-0 py-4 bg-white/80 backdrop-blur-md -mx-12 px-12 border-t-2 border-gray-50 z-20">
                   <button 
                    disabled={loading}
                    onClick={updateProfile}
                    className="px-12 py-6 bg-chibi-orange text-white rounded-[2.5rem] font-black shadow-xl shadow-orange-100 hover:scale-105 active:scale-95 transition-all border-b-8 border-orange-700 uppercase tracking-[0.2em] flex items-center gap-4"
                   >
                    {loading ? 'Đang lưu...' : (
                      <>LƯU THAY ĐỔI ✨ <CheckCircle2 size={24} /></>
                    )}
                   </button>
                </div>

                {/* BG Decor */}
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-chibi-orange/5 rounded-full blur-3xl pointer-events-none" />
             </div>
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="space-y-10">
            {!selectedTopic ? (
              <>
                <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border-2 border-gray-50 flex-col sm:flex-row gap-6">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-3xl font-black text-gray-800 tracking-tight text-center sm:text-left">🌟 KHO HỌC LIỆU SỐ 🌟</h3>
                      <p className="text-gray-400 font-bold text-lg mt-1 text-center sm:text-left">Hệ thống học liệu Khoa học 4 - Kết nối tri thức.</p>
                    </div>
                    <button 
                      onClick={() => setManageTopics(!manageTopics)}
                      className={`p-4 rounded-2xl transition-all ${manageTopics ? 'bg-chibi-orange text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      title="Quản lý chủ đề"
                    >
                      <Settings size={24} className={manageTopics ? 'animate-spin-slow' : ''} />
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowAddTopic(true)}
                    className="px-10 py-5 bg-chibi-orange text-white rounded-[2rem] font-black shadow-xl shadow-orange-100 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border-b-8 border-orange-700 whitespace-nowrap relative z-20 cursor-pointer"
                  >
                    <Plus size={24} /> TẠO CHỦ ĐỀ MỚI
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {topics.map(topic => (
                    <motion.div 
                      key={topic.id}
                      whileHover={{ y: -8 }}
                      className="card-chibi bg-white p-10 group hover:border-chibi-orange transition-all relative flex flex-col"
                      style={{ borderBottom: `8px solid ${topic.color || '#FFB300'}` }}
                    >
                        {manageTopics && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmation({
                                id: topic.id,
                                type: 'topic',
                                title: topic.title,
                                onConfirm: () => deleteTopic(topic.id)
                              });
                            }}
                            className="absolute top-4 right-4 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-white z-50 cursor-pointer pointer-events-auto"
                            title="Xóa chủ đề"
                          >
                            <X size={20} />
                          </motion.button>
                        )}

                        <div className="flex justify-between items-start mb-8 relative z-10">
                          <div 
                            className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-5xl group-hover:scale-110 transition-all border-2 border-transparent group-hover:border-white shadow-sm"
                            style={{ backgroundColor: `${topic.color || '#FFB300'}20` }}
                          >
                               {topic.icon || '📦'}
                          </div>
                        </div>

                        <h4 className="font-black text-2xl text-gray-800 mb-2 truncate relative z-10">{topic.title}</h4>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-10 relative z-10">Bài học môn Khoa Học</p>
                        
                        <div className="mt-auto space-y-3 relative z-20">
                          <button 
                            type="button"
                            onClick={() => setSelectedTopic(topic)}
                            className="w-full py-4 bg-chibi-orange text-white rounded-2xl text-xs font-black hover:bg-orange-600 transition-all transform hover:shadow-lg active:scale-95 border-b-4 border-orange-800 uppercase tracking-widest cursor-pointer"
                          >
                              QUẢN LÝ DANH MỤC
                          </button>
                        </div>
                        
                        <div className="absolute top-[20%] right-[-20%] w-48 h-48 bg-chibi-orange/5 rounded-full blur-3xl pointer-events-none" />
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-8">
                 {/* Breadcrumbs / Back button */}
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        setSelectedTopic(null);
                        setSelectedCategory(null);
                      }}
                      className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-chibi-orange transition-all hover:scale-105"
                    >
                       <ArrowLeft size={24} />
                    </button>
                    <div>
                       <h3 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                          <span className="text-4xl">{selectedTopic.icon}</span> {selectedTopic.title}
                       </h3>
                       <p className="text-gray-400 font-bold text-sm">Quản lý danh mục bài học và học liệu trợ giảng.</p>
                    </div>
                 </div>

                 {/* Library Management UI */}
                 <div className="flex flex-col md:flex-row gap-8 h-full overflow-hidden">
                    {/* Vertical Category Navigation */}
                    <div className="w-full md:w-72 flex flex-col gap-4 bg-white p-6 rounded-[3rem] shadow-sm border-2 border-gray-50 shrink-0 overflow-y-auto scrollbar-hide relative">
                       <div className="flex items-center justify-between px-4 mb-4 shrink-0 border-b-2 border-gray-50 pb-4 mt-2 sticky top-0 bg-white z-20">
                          <div className="flex items-center gap-3">
                            <Filter size={20} className="text-chibi-orange" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Danh mục</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setManageCategories(!manageCategories)}
                            className={`p-2 rounded-xl transition-all ${manageCategories ? 'bg-chibi-orange text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            <Settings size={16} />
                          </button>
                       </div>
                       <div className="flex flex-col gap-4 pr-2">
                          {categories.map(cat => (
                            <div key={cat.id} className="relative group">
                              <button 
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full px-6 py-5 rounded-[1.5rem] font-black text-sm tracking-tight transition-all flex items-center gap-4 relative overflow-hidden text-left ${
                                  selectedCategory?.id === cat.id 
                                    ? 'text-white shadow-xl scale-[1.02] z-10' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:translate-x-1'
                                }`}
                                style={{ 
                                  backgroundColor: selectedCategory?.id === cat.id ? (selectedTopic.color || '#FFB300') : undefined,
                                  boxShadow: selectedCategory?.id === cat.id ? `0 15px 30px ${(selectedTopic.color || '#FFB300')}40` : undefined
                                }}
                              >
                                 <div className={`w-3 h-3 rounded-full shrink-0 ${selectedCategory?.id === cat.id ? 'bg-white' : ''}`} style={{ backgroundColor: selectedCategory?.id !== cat.id ? (selectedTopic.color || '#FFB300') : undefined }} />
                                 <span className="truncate">{cat.title}</span>
                              </button>
                              {manageCategories && (
                                <motion.button 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmation({
                                      id: cat.id,
                                      type: 'category',
                                      title: cat.title,
                                      onConfirm: async () => {
                                        const path = `categories/${cat.id}`;
                                        try {
                                          await deleteDoc(doc(db, 'categories', cat.id));
                                          await fetchCategories(selectedTopic.id);
                                          if(selectedCategory?.id === cat.id) setSelectedCategory(null);
                                        } catch (error) {
                                          handleFirestoreError(error, OperationType.DELETE, path);
                                        }
                                      }
                                    });
                                  }}
                                  className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-full shadow-2xl transition-all z-40 border-4 border-white hover:scale-110 active:scale-90 cursor-pointer pointer-events-auto"
                                >
                                  <X size={18} />
                                </motion.button>
                              )}
                            </div>
                          ))}
                          <button 
                            onClick={() => setShowAddCategory(true)}
                            className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-50 text-chibi-orange rounded-2xl hover:bg-chibi-orange hover:text-white transition-all shadow-sm border-2 border-transparent hover:border-white hover:scale-110 active:scale-90"
                            title="Thêm danh mục mới"
                          >
                             <Plus size={24} />
                          </button>
                       </div>
                    </div>

                    {/* Materials Content */}
                    <div className="flex-1 bg-white rounded-[3rem] p-10 shadow-sm border-2 border-gray-50 flex flex-col overflow-hidden relative">
                       {selectedCategory ? (
                         <>
                           <div className="flex justify-between items-center mb-10">
                              <div className="flex items-center gap-4">
                                 <div>
                                    <h4 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                                       <span className="w-2 h-8 rounded-full" style={{ backgroundColor: selectedTopic.color || '#FFB300' }} /> {selectedCategory.title}
                                    </h4>
                                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1 ml-5">Học liệu • {materials.length} mục</p>
                                 </div>
                                 <button 
                                   onClick={() => setManageMaterials(!manageMaterials)}
                                   className={`p-2 rounded-xl transition-all ${manageMaterials ? 'bg-chibi-blue text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
                                   title="Quản lý học liệu"
                                 >
                                   <Settings size={18} />
                                 </button>
                              </div>
                              <button 
                                onClick={() => setShowAddMaterial(true)}
                                className="px-8 py-5 text-white rounded-2xl font-black shadow-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-xs border-b-4"
                                style={{ 
                                   backgroundColor: selectedTopic.color || '#42A5F5',
                                   boxShadow: `0 10px 25px ${(selectedTopic.color || '#42A5F5')}30`,
                                   borderBottomColor: 'rgba(0,0,0,0.2)' 
                                }}
                              >
                                <Plus size={20} /> THÊM HỌC LIỆU MỚI
                              </button>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto pr-4 flex-1 scrollbar-hide">
                              {materials.map(mat => (
                               <div key={mat.id} className="p-6 bg-gray-50 rounded-[2rem] border-4 border-transparent transition-all group flex items-start gap-5 relative hover:border-white hover:shadow-xl"
                                     style={{ borderLeft: `8px solid ${selectedTopic.color || '#FFB300'}` }}
                                >
                                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                      mat.type === 'video' ? 'bg-red-50 text-red-500' :
                                      mat.type === 'game' ? 'bg-purple-50 text-purple-500' :
                                      mat.type === 'pdf' ? 'bg-orange-50 text-orange-500' :
                                      'bg-blue-50 text-blue-500'
                                   }`}>
                                      {mat.type === 'video' ? <Video size={32} /> : 
                                       mat.type === 'game' ? <Gamepad2 size={32} /> : 
                                       mat.type === 'pdf' ? <FileText size={32} /> : 
                                       <BookOpen size={32} />}
                                   </div>
                                   <div className="flex-1 overflow-hidden">
                                      <h5 className="font-black text-gray-800 text-lg mb-1 truncate">{mat.title}</h5>
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{mat.type}</p>
                                      <a href={mat.url} target="_blank" rel="noreferrer" className="text-xs font-black text-chibi-blue hover:underline break-all block truncate">{mat.url}</a>
                                   </div>
                                {manageMaterials && (
                                   <motion.button 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmation({
                                        id: mat.id,
                                        type: 'material',
                                        title: mat.title,
                                        onConfirm: () => deleteMaterial(mat.id)
                                      });
                                    }}
                                    className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center bg-red-500 text-white shadow-xl rounded-full border-4 border-white z-50 cursor-pointer pointer-events-auto hover:scale-110 active:scale-90 transition-all"
                                  >
                                     <X size={18} />
                                  </motion.button>
                                )}
                                </div>
                              ))}
                              {materials.length === 0 && (
                                <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                      <Sparkles className="text-gray-200 w-10 h-10" />
                                   </div>
                                   <p className="text-gray-300 font-black uppercase tracking-[0.2em] text-sm">Chưa có học liệu cho danh mục này</p>
                                </div>
                              )}
                           </div>
                         </>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                            <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                               <img src="https://api.iconify.design/noto:mouse-face.svg" className="w-32 mb-8 grayscale" />
                            </motion.div>
                            <p className="text-3xl font-black text-gray-300 uppercase tracking-[0.3em]">Chọn một danh mục <br /> để bắt đầu 🚀</p>
                         </div>
                       )}

                       {/* BG Decor */}
                       <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-chibi-blue/5 rounded-full blur-3xl pointer-events-none" />
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}


        {activeTab === 'classes' && (
          <div className="bg-white rounded-[4rem] p-12 shadow-sm border-2 border-gray-50 overflow-hidden relative">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 relative z-10">
                <div className="flex items-center gap-6">
                   <div>
                      <h3 className="text-4xl font-black text-gray-800 tracking-tight">Quản lý Lớp Học 🎒</h3>
                      <p className="text-gray-400 font-bold text-xl mt-2 mb-0">Quản lý chuyên cần, tiến độ và xuất báo cáo tự động.</p>
                   </div>
                   <button 
                     onClick={() => setManageStudents(!manageStudents)}
                     className={`p-4 rounded-2xl transition-all ${manageStudents ? 'bg-chibi-orange text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                     title="Quản lý học sinh"
                   >
                     <Settings size={24} className={manageStudents ? 'animate-spin-slow' : ''} />
                   </button>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => fetchClassProgress()}
                    className="p-5 bg-white text-chibi-orange rounded-[2rem] font-black shadow-lg border-2 border-gray-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Clock size={22} /> CẬP NHẬT TIẾN ĐỘ
                  </button>
                  <button 
                    onClick={() => exportToExcel(students, `Danh_Sach_Lop_${user.classId || '4A'}`)}
                    className="px-8 py-5 bg-chibi-blue text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border-b-8 border-blue-700"
                   >
                     <Download size={22} /> XUẤT EXCEL
                   </button>
                   <button 
                     onClick={() => setShowAddStudent(true)}
                     className="px-8 py-5 bg-chibi-pink text-white rounded-[2rem] font-black shadow-xl shadow-pink-100 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border-b-8 border-pink-700"
                   >
                     <Plus size={22} /> THÊM HỌC SINH
                   </button>
                </div>
             </div>

             <div className="relative z-10">
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10">
                 {students.map((student) => {
                   const progress = classProgress[student.id] || 0;
                   const isStudied = progress > 0;
                   
                   return (
                     <div key={student.id} className="flex flex-col items-center group relative">
                        {/* Actions Overlay for teacher */}
                        {manageStudents && (
                           <motion.div 
                             initial={{ scale: 0 }}
                             animate={{ scale: 1 }}
                             className="absolute top-2 right-2 z-40"
                           >
                              <button 
                               type="button"
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 setDeleteConfirmation({
                                   id: student.id,
                                   type: 'student',
                                   title: student.name,
                                   onConfirm: () => deleteStudent(student.id)
                                 });
                               }}
                               className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                               title="Xóa học sinh"
                              >
                               <X size={18} />
                              </button>
                           </motion.div>
                        )}

                        <div className="relative w-32 h-32 mb-4 group">
                          {/* Circular Progress */}
                          <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-gray-100"
                            />
                            <motion.circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={364.4}
                              initial={{ strokeDashoffset: 364.4 }}
                              animate={{ strokeDashoffset: 364.4 - (364.4 * progress) / 100 }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={isStudied ? "text-chibi-green" : "text-chibi-orange"}
                            />
                          </svg>

                          {/* Egg Avatar */}
                          <div 
                            onClick={() => fetchStudentDetail(student)}
                            className="absolute inset-0 flex items-center justify-center p-6 cursor-pointer"
                          >
                            <div className={`w-full h-full rounded-[2rem] flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:scale-110 ${isStudied ? 'bg-chibi-green/10' : 'bg-chibi-orange/10'}`}>
                              <img 
                                src={isStudied ? "https://api.iconify.design/noto:hatched-chick.svg" : "https://api.iconify.design/noto:egg.svg"} 
                                className={`w-16 h-16 transition-all duration-500 ${!isStudied ? 'grayscale brightness-110' : ''}`} 
                                alt="Egg Progress"
                              />
                              {/* Egg Color Overlay */}
                              <div className={`absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500 ${isStudied ? 'bg-green-400' : 'bg-red-400'}`} />
                            </div>
                          </div>

                          {/* Percentage Badge */}
                          <div className={`absolute -bottom-2 right-0 px-3 py-1 rounded-full text-[10px] font-black text-white shadow-lg border-2 border-white ${isStudied ? 'bg-chibi-green' : 'bg-chibi-orange'}`}>
                            {progress}%
                          </div>
                        </div>
                        
                        <div className="text-center w-full">
                           <p className="font-black text-gray-800 text-sm truncate px-2 group-hover:text-chibi-orange transition-colors">{student.name}</p>
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Lớp {student.classId}</p>
                        </div>
                     </div>
                   );
                 })}
               </div>
               
               {students.length === 0 && (
                 <div className="py-32 text-center border-4 border-dashed border-gray-50 rounded-[4rem]">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Users className="w-12 h-12 text-gray-200" />
                    </div>
                    <p className="text-2xl font-black text-gray-200 uppercase tracking-widest">Lớp mình chưa có bạn nhỏ nào ✨</p>
                    <button 
                      onClick={() => setShowAddStudent(true)}
                      className="mt-6 px-8 py-4 bg-chibi-orange text-white rounded-2xl font-black text-xs hover:scale-105 transition-all"
                    >
                      THÊM HỌC SINH NGAY
                    </button>
                 </div>
               )}
             </div>
             
             {/* Decor */}
             <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-chibi-blue/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {/* Add Student Modal */}
          {showAddStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[3.5rem] p-10 max-w-lg w-full shadow-2xl relative"
              >
                <button onClick={() => setShowAddStudent(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500"><X size={24} /></button>
                <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
                   <Plus className="text-chibi-pink shrink-0" /> Thêm Học Sinh Mới 👦
                </h3>
                
                <form onSubmit={createStudent} className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Họ và tên học sinh</label>
                      <input 
                        required
                        type="text"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-pink outline-none transition-all font-bold"
                        placeholder="Nhập tên em..."
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Mã đăng nhập</label>
                         <input 
                           required
                           type="text"
                           value={newStudent.code}
                           onChange={(e) => setNewStudent({...newStudent, code: e.target.value})}
                           className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-pink outline-none transition-all font-bold"
                           placeholder="HS001"
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Mật khẩu</label>
                         <input 
                           required
                           type="password"
                           value={newStudent.password}
                           onChange={(e) => setNewStudent({...newStudent, password: e.target.value})}
                           className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-pink outline-none transition-all font-bold"
                           placeholder="••••"
                         />
                      </div>
                   </div>
                   <button 
                    disabled={loading}
                    className="w-full py-6 mt-4 bg-chibi-pink text-white rounded-[2rem] font-black shadow-xl shadow-pink-100 hover:scale-[1.02] active:scale-[0.98] transition-all border-b-8 border-pink-700 uppercase tracking-widest"
                   >
                    {loading ? 'Đang tạo...' : 'Tạo tài khoản học sinh 🚀'}
                   </button>
                </form>
              </motion.div>
            </div>
          )}

          {/* Add Topic Modal */}
          {showAddTopic && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[3.5rem] p-10 max-w-md w-full shadow-2xl relative"
              >
                <button onClick={() => setShowAddTopic(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500"><X size={24} /></button>
                <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
                   <Plus className="text-chibi-orange shrink-0" /> Chủ Đề Mới 🔬
                </h3>
                
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Tên chủ đề bài học</label>
                      <input 
                        type="text"
                        value={newTopic.title}
                        onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold"
                        placeholder="VD: Năng Lượng Tái Tạo..."
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Icon (Emoji)</label>
                        <input 
                          type="text"
                          value={newTopic.icon}
                          onChange={(e) => setNewTopic({...newTopic, icon: e.target.value})}
                          className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold text-center text-2xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Màu chủ đạo</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color"
                            value={newTopic.color}
                            onChange={(e) => setNewTopic({...newTopic, color: e.target.value})}
                            className="w-full h-[64px] rounded-2xl cursor-pointer border-4 border-white shadow-sm appearance-none p-0 overflow-hidden"
                          />
                        </div>
                      </div>
                   </div>
                   <button 
                    onClick={addTopic}
                    className="w-full py-6 mt-4 bg-chibi-orange text-white rounded-[2rem] font-black shadow-xl shadow-orange-100 hover:scale-[1.02] active:scale-[0.98] transition-all border-b-8 border-orange-700 uppercase tracking-widest"
                   >
                    TẠO CHỦ ĐỀ 🚀
                   </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Add Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[3.5rem] p-10 max-w-md w-full shadow-2xl relative"
              >
                <button onClick={() => setShowAddCategory(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500"><X size={24} /></button>
                <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
                   <Plus className="text-chibi-orange shrink-0" /> Thêm Danh Mục 📑
                </h3>
                
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">Tên danh mục bài học</label>
                      <input 
                        type="text"
                        value={newCategoryTitle}
                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold"
                        placeholder="VD: Đặc điểm của nấm..."
                      />
                   </div>
                   <button 
                    onClick={addCategory}
                    className="w-full py-6 mt-4 bg-chibi-orange text-white rounded-[2rem] font-black shadow-xl shadow-orange-100 hover:scale-[1.02] active:scale-[0.98] transition-all border-b-8 border-orange-700 uppercase tracking-widest"
                   >
                    TẠO DANH MỤC 🚀
                   </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Global Delete Confirmation Modal */}
          {deleteConfirmation && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[3.5rem] p-12 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-3 bg-red-500" />
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Trash2 size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-800 mb-4 whitespace-pre-wrap">Xác nhận xóa?</h3>
                <p className="text-gray-500 font-bold mb-10 leading-relaxed text-lg px-4 line-clamp-3">
                  Bạn có muốn xóa <span className="text-red-500 font-black">"{deleteConfirmation.title}"</span>? 
                  {deleteConfirmation.type === 'topic' || deleteConfirmation.type === 'category' ? ' Hành động này không thể hoàn tác và sẽ xóa tất cả thư mục/học liệu liên quan.' : ' Dữ liệu này sẽ bị xóa vĩnh viễn.'}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setDeleteConfirmation(null)}
                    className="py-5 bg-gray-100 text-gray-500 rounded-3xl font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-sm border-b-6 border-gray-200 active:translate-y-1 active:border-b-0"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      await deleteConfirmation.onConfirm();
                      setLoading(false);
                      setDeleteConfirmation(null);
                    }}
                    className="py-5 bg-red-500 text-white rounded-3xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-100 uppercase tracking-widest text-sm border-b-6 border-red-700 active:translate-y-1 active:border-b-0"
                  >
                    Đồng ý xóa
                  </button>
                </div>

                {/* Decorative particles */}
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
              </motion.div>
            </div>
          )}

          {/* Manage Material Types Modal */}
          {showAddType && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative"
              >
                <button onClick={() => setShowAddType(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500"><X size={24} /></button>
                <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                   <Settings className="text-chibi-orange shrink-0" /> Quản Lý Loại Học Liệu 🛠️
                </h3>
                
                <div className="space-y-6">
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {materialTypes.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-gray-100 transition-all">
                        <span className="font-bold text-gray-700">{t.title}</span>
                        <button 
                          onClick={() => setDeleteConfirmation({
                            id: t.id,
                            type: 'material',
                            title: t.title,
                            onConfirm: () => deleteMaterialType(t.id)
                          })}
                          className="text-gray-300 hover:text-red-500 transition-colors p-2"
                          title="Xóa loại học liệu"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-gray-100">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Thêm loại mới</label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="flex-1 p-4 rounded-xl bg-gray-50 border-4 border-transparent focus:border-chibi-orange outline-none transition-all font-bold text-sm"
                        placeholder="VD: Mô hình 3D, Link đính kèm..."
                      />
                      <button 
                        onClick={addMaterialType}
                        className="p-4 bg-chibi-orange text-white rounded-xl shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowAddType(false)}
                    className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Add Material Modal */}
          {showAddMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[3.5rem] p-10 max-w-lg w-full shadow-2xl relative"
              >
                <button onClick={() => setShowAddMaterial(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500"><X size={24} /></button>
                <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
                   <Plus className="text-chibi-blue shrink-0" /> Thêm Học Liệu 🎬
                </h3>
                
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Tiêu đề học liệu</label>
                      <input 
                        type="text"
                        value={newMaterial.title}
                        onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                        className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-blue outline-none transition-all font-bold"
                        placeholder="VD: Video bài giảng Nấm..."
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <div className="flex justify-between items-center mb-2 ml-2">
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Loại học liệu</label>
                             <button 
                               type="button" 
                               onClick={() => setShowAddType(true)} 
                               className="text-chibi-blue hover:scale-110 transition-transform p-1 bg-blue-50 rounded-lg"
                               title="Quản lý loại học liệu"
                             >
                                <Settings size={12} />
                             </button>
                          </div>
                         <select 
                           value={newMaterial.type}
                           onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value})}
                           className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-blue outline-none transition-all font-bold appearance-none"
                         >
                            {materialTypes.length > 0 ? (
                               materialTypes.map(t => (
                                 <option key={t.id} value={t.value}>{t.title}</option>
                               ))
                             ) : (
                               <>
                                 <option value="elearning">Bài giảng eLearning</option>
                                 <option value="canva">Canva / Genially</option>
                                 <option value="slides">Google Slides / PPT</option>
                                 <option value="video">Video (YouTube/AI)</option>
                                 <option value="pdf">Tài liệu PDF / Hình ảnh</option>
                                 <option value="game">Trò chơi (Wordwall/Quizizz)</option>
                                 <option value="discovery">Góc khám phá</option>
                               </>
                             )}
                         </select>
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Link (URL / iframe)</label>
                         <input 
                           type="text"
                           value={newMaterial.url}
                           onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})}
                           className="w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent focus:border-chibi-blue outline-none transition-all font-bold"
                           placeholder="https://..."
                         />
                      </div>
                   </div>
                   <button 
                    onClick={addMaterial}
                    className="w-full py-6 mt-4 bg-chibi-blue text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all border-b-8 border-blue-700 uppercase tracking-widest"
                   >
                    THÊM VÀO DANH MỤC 🎨
                   </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Student Detail Modal */}
          {selectedStudentDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#FFF9F0] rounded-[3.5rem] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden chibi-pattern"
              >
                <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: selectedStudentDetail.themeColor || '#FFB300' }} />
                <button 
                  onClick={() => setSelectedStudentDetail(null)} 
                  className="absolute top-8 right-8 text-gray-300 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center border-4 border-white overflow-hidden flex-shrink-0">
                    <img 
                      src={classProgress[selectedStudentDetail.id] > 0 ? "https://api.iconify.design/noto:hatched-chick.svg" : "https://api.iconify.design/noto:egg.svg"} 
                      className="w-20 h-20"
                      alt="Student Avatar"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-3xl font-black text-gray-800 tracking-tight mb-1">{selectedStudentDetail.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-3 py-1 bg-chibi-blue/10 text-chibi-blue rounded-full text-[10px] font-black uppercase tracking-widest">Mã: {selectedStudentDetail.code}</span>
                      <span className="px-3 py-1 bg-chibi-orange/10 text-chibi-orange rounded-full text-[10px] font-black uppercase tracking-widest">Lớp: {selectedStudentDetail.classId}</span>
                      <span className="px-3 py-1 bg-chibi-green/10 text-chibi-green rounded-full text-[10px] font-black uppercase tracking-widest">Tiến độ: {classProgress[selectedStudentDetail.id] || 0}%</span>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-50 max-h-[40vh] overflow-y-auto">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BookOpen size={14} /> Danh sách bài học đã hoàn thành
                      </h4>
                      
                      {studentProgressList.length > 0 ? (
                        <div className="space-y-3">
                          {studentProgressList.filter(p => p.completed).map(progressItem => {
                            const material = allMaterials.find(m => m.id === progressItem.id);
                            return (
                              <div key={progressItem.id} className="flex items-center justify-between p-4 bg-chibi-green/5 rounded-2xl border border-chibi-green/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-chibi-green rounded-xl flex items-center justify-center text-white text-xs">
                                    <Check size={16} />
                                  </div>
                                  <span className="font-bold text-gray-700 text-sm">{material?.title || 'Đang tải...'}</span>
                                </div>
                                <span className="text-[10px] font-black text-chibi-green bg-white px-2 py-1 rounded-lg">HOÀN THÀNH</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10 opacity-30">
                          <p className="font-black text-xs uppercase tracking-widest text-gray-400">Chưa bắt đầu học bài nào ✨</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex gap-4">
                      <button 
                        onClick={() => {
                          const newPass = prompt('Nhập mật khẩu mới cho học sinh:');
                          if (newPass) {
                            setDoc(doc(db, 'users', selectedStudentDetail.id), { password: newPass }, { merge: true })
                              .then(() => alert('Đã cập nhật mật khẩu!'))
                              .catch(e => alert('Lỗi: ' + e.message));
                          }
                        }}
                        className="flex-1 py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all uppercase tracking-widest"
                      >
                        Đổi mật khẩu
                      </button>
                      <button 
                        onClick={() => setSelectedStudentDetail(null)}
                        className="flex-1 py-4 bg-chibi-pink text-white rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-100 uppercase tracking-widest border-b-4 border-pink-700"
                      >
                        Đóng lại
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Stats Report Modal */}
          {showStatsReport && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[4rem] p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-hide"
              >
                <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: teacherProfile.themeColor }} />
                <button onClick={() => setShowStatsReport(null)} className="absolute top-10 right-10 p-4 bg-gray-50 rounded-full text-gray-400 hover:text-gray-800 transition-all hover:rotate-90">
                  <X size={28} />
                </button>

                <div className="mb-12">
                  <h3 className="text-4xl font-black text-gray-800 mb-2 flex items-center gap-4">
                    <BarChart3 className="text-chibi-orange w-10 h-10" /> 
                    {showStatsReport === 'students' ? 'Báo cáo Học sinh' : 
                     showStatsReport === 'lessons' ? 'Báo cáo Học liệu' : 'Báo cáo Tiến độ'}
                  </h3>
                  <p className="text-gray-400 font-bold text-lg">Phân tích chi tiết và đánh giá học tập của lớp {user.classId || '4A'}.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   {/* Key Metrics */}
                   <div className="space-y-6">
                      <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-white shadow-sm">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Phân bổ tiến độ</p>
                         <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie
                                    data={statsData.progressDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                  >
                                    {statsData.progressDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend verticalAlign="bottom" height={36}/>
                               </PieChart>
                            </ResponsiveContainer>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="p-8 bg-chibi-blue/5 rounded-[2.5rem] border-2 border-white shadow-sm h-full">
                         <h4 className="font-black text-gray-800 text-xl mb-6">Đánh giá chung 🐻</h4>
                         <div className="space-y-6">
                            <EvaluationItem icon={<Target className="text-chibi-blue" />} label="Mục tiêu bài học" value={`${statsData.materialCount} bài giảng`} />
                            <EvaluationItem icon={<Users className="text-chibi-orange" />} label="Số lượng học sinh" value={`${statsData.studentCount} em`} />
                            <EvaluationItem icon={<Trophy className="text-chibi-green" />} label="Tỷ lệ hoàn thành" value={`${statsData.avgProgress}%`} />
                            <div className="pt-6 border-t-2 border-white">
                               <p className="text-sm font-bold text-gray-500 leading-relaxed italic">
                                  "Gấu nhận thấy lớp mình đang làm rất tốt! {statsData.avgProgress > 70 ? 'Phần lớn các bạn đã theo kịp bài giảng. Thầy/Cô có thể bổ sung thêm các trò chơi để tăng tính tương tác nhé! ✨' : 'Hãy khích lệ các em học tập chăm chỉ hơn để đạt kết quả tốt nhất nào! 📚'}"
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="md:col-span-2 p-8 bg-white rounded-[2.5rem] border-4 border-gray-50">
                      <h4 className="font-black text-gray-800 text-xl mb-8">Danh sách chi tiết tiến độ</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b-2 border-gray-100">
                              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Học sinh</th>
                              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tiến độ</th>
                              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(s => {
                              const prog = classProgress[s.id] || 0;
                              return (
                                <tr key={s.id} className="border-b border-gray-50 group hover:bg-gray-50 transition-all">
                                  <td className="py-4 font-bold text-gray-700">{s.name}</td>
                                  <td className="py-4">
                                    <div className="flex items-center gap-3 justify-center">
                                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-chibi-orange" style={{ width: `${prog}%` }} />
                                      </div>
                                      <span className="text-xs font-black text-gray-400">{prog}%</span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-right">
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${prog >= 80 ? 'bg-chibi-green/10 text-chibi-green' : 'bg-chibi-orange/10 text-chibi-orange'}`}>
                                      {prog >= 80 ? 'Xuất sắc' : prog >= 50 ? 'Khá' : 'Đang cố gắng'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                   </div>
                </div>

                <div className="mt-12 flex justify-center">
                   <button onClick={() => setShowStatsReport(null)} className="px-12 py-5 bg-gray-800 text-white rounded-[2rem] font-black shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs">
                      Đóng báo cáo 🐻
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>



      </main>
    </div>
  );
}

function ProfileField({ label, value, disabled }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-2 tracking-widest">{label}</label>
      <div className={`w-full p-5 rounded-2xl bg-gray-50 border-4 border-transparent font-bold ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function NavItem({ sticker, label, active, onClick, themeColor }: any) {
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
          layoutId="navActiveLine"
          className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" 
        />
      )}
    </motion.button>
  );
}

function SidebarItem({ icon, label, active, onClick, themeColor }: any) {
  return (
    <motion.button 
      whileHover={{ scale: 1.05, x: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2rem] font-black text-sm transition-all group relative overflow-hidden ${
        active 
          ? 'text-white shadow-xl translate-x-3 scale-105 border-b-4 border-black/10' 
          : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
      }`}
      style={{ 
        backgroundColor: active ? (themeColor || '#FFB300') : undefined,
        boxShadow: active ? `0 15px 30px ${(themeColor || '#FFB300')}30` : undefined
      }}
    >
      <span className={`${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-chibi-orange'} transition-transform duration-300`}
            style={{ color: !active ? undefined : 'white' }}>
        {icon}
      </span>
      <span className="tracking-tight uppercase text-xs">{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebarActiveDot"
          className="ml-auto w-2 h-2 bg-white rounded-full shadow-[0_0_8px_#fff]" 
        />
      )}
    </motion.button>
  );
}

function StatCard({ icon, label, value, color, onClick }: any) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-10 rounded-[3rem] bg-white border-2 border-gray-50 shadow-sm transition-all hover:shadow-2xl group flex flex-col items-center text-center cursor-pointer`}
    >
      <div className={`w-20 h-20 ${color} rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner`}>
        {icon}
      </div>
      <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] mb-3">{label}</p>
      <h4 className="text-5xl font-black text-gray-800 tracking-tighter">{value}</h4>
      <div className="mt-6 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 text-chibi-blue font-bold text-[10px] uppercase tracking-widest">
        Xem chi tiết <ChevronRight size={14} />
      </div>
    </motion.div>
  );
}

function EvaluationItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-lg font-black text-gray-700">{value}</p>
      </div>
    </div>
  );
}

function ScheduleItem({ time, title, active, type, onDelete }: any) {
  return (
    <div className={`flex items-center gap-5 p-6 rounded-[2rem] transition-all cursor-pointer border-2 group ${active ? 'bg-orange-50 border-chibi-orange/30 shadow-sm' : 'border-transparent hover:bg-gray-50 hover:border-gray-100'}`}>
      <span className={`text-xs font-black w-14 ${active ? 'text-chibi-orange' : 'text-gray-300'}`}>{time}</span>
      <div className="w-1.5 h-8 bg-gray-100 rounded-full overflow-hidden">
         {active && <div className="w-full h-full bg-chibi-orange" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          {type === 'reminder' && <span className="text-[8px] font-black bg-chibi-pink text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Nhắc hẹn</span>}
          {type === 'lesson' && <span className="text-[8px] font-black bg-chibi-blue text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Tiết học</span>}
        </div>
        <p className={`text-md font-black ${active ? 'text-gray-800' : 'text-gray-500'} tracking-tight`}>{title}</p>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
