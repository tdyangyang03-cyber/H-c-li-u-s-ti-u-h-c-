/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Login from './pages/Login';
import TeacherOnboarding from './pages/TeacherOnboarding';
import ChatBot from './components/ChatBot';

export type UserRole = 'teacher' | 'student';

export interface UserData {
  uid: string;
  role: UserRole;
  name: string;
  username?: string;
  password?: string;
  linkedUid?: string;
  email?: string;
  avatar?: string;
  classId?: string;
  teacherId?: string;
  school?: string;
  bio?: string;
  phone?: string;
  themeColor?: string;
  updatedAt?: string;
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    let unsubscribeFirestore: () => void = () => {};

    // Check for student session first
    const savedStudent = localStorage.getItem('student_user');
    if (savedStudent) {
      const studentData = JSON.parse(savedStudent);
      
      unsubscribeFirestore = onSnapshot(doc(db, 'users', studentData.uid), (docSnap) => {
        if (docSnap.exists()) {
          const updatedStudent = { uid: docSnap.id, ...docSnap.data() } as UserData;
          setUser(updatedStudent);
          localStorage.setItem('student_user', JSON.stringify(updatedStudent));
        } else {
          // If student doc deleted, logout
          localStorage.removeItem('student_user');
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        console.error('Student snapshot error:', error);
        setUser(studentData);
        setLoading(false);
      });

      return () => unsubscribeFirestore && unsubscribeFirestore();
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        unsubscribeFirestore = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserData);
            setOnboarding(false);
          } else {
            // If it's a teacher (Firebase Auth), but no profile yet, start onboarding
            if (fbUser.email) {
              setOnboarding(true);
            } else {
              setUser(null);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'users');
          setLoading(false);
        });
      } else {
        setUser(null);
        setOnboarding(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  const logout = async () => {
    await auth.signOut();
    localStorage.removeItem('student_user');
    setUser(null);
    setOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chibi-orange/5">
        <div className="flex flex-col items-center">
          <motion.img 
            src="https://api.iconify.design/noto:bear.svg" 
            className="w-20 h-20 mb-4"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <p className="text-xl font-black text-chibi-orange uppercase tracking-widest">Đang tải Học Liệu Số...</p>
        </div>
      </div>
    );
  }

  if (onboarding && firebaseUser) {
    return <TeacherOnboarding user={firebaseUser} onComplete={(data) => { setUser(data); setOnboarding(false); }} />;
  }

  if (!user) {
    return <Login onStudentLogin={(data) => setUser(data)} />;
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0] relative overflow-hidden font-sans chibi-pattern">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-[10%] text-6xl"
        >
          ☁️
        </motion.div>
        <motion.div 
          animate={{ x: [0, -150, 0], y: [0, 80, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-40 right-[15%] text-7xl"
        >
          ☁️
        </motion.div>
        <motion.div 
          animate={{ x: [0, 200, 0], y: [0, -40, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-40 left-[20%] text-6xl opacity-50"
        >
          🌟
        </motion.div>
        <motion.div 
          animate={{ scale: [1, 1.5, 1], rotate: [0, 45, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-60 left-[50%] text-5xl opacity-30"
        >
          🎨
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={user.uid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {user.role === 'teacher' ? (
            <TeacherDashboard user={user} onLogout={logout} />
          ) : (
            <StudentDashboard user={user} onLogout={logout} />
          )}
        </motion.div>
      </AnimatePresence>

      <ChatBot user={user} />
    </div>
  );
}

