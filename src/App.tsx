import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, User, AiMessage } from './store';
import { RankBadge } from './components/RankBadge';
import { 
  chatWithAI, predictFuture, searchWeb, analyzeImage, 
  fastResponse, analyzeVideo, transcribeAudio, thinkDeep, generateImage, prepareForExam
} from './services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { 
  Home, CheckSquare, Calendar, Bot, Trophy, ShoppingCart, 
  Users, Presentation, Camera, Settings, Send, Image as ImageIcon,
  LogOut, Star, MessageSquare, Plus, FileText, CreditCard, X,
  Search, Zap, Video, Mic, Brain, Sparkles, Upload, ChevronDown,
  Check, CheckCheck, Info, TrendingDown
} from 'lucide-react';

const socket: Socket = io(import.meta.env.VITE_APP_URL || 'http://localhost:3000');

const subjectsList = ['Математика', 'Физика', 'Информатика', 'Химия', 'Биология', 'История', 'Английский', 'Казахский', 'Русский'];

// --- API Helpers ---
const api = {
  post: async (url: string, body: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      return text.trim() ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return {};
    }
  },
  get: async (url: string) => {
    const res = await fetch(url);
    const text = await res.text();
    try {
      return text.trim() ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return {};
    }
  },
  delete: async (url: string) => {
    const res = await fetch(url, { method: 'DELETE' });
    const text = await res.text();
    try {
      return text.trim() ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return {};
    }
  }
};

// --- Particles Background ---
const ParticlesBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-50"
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 100,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: -100,
            x: `calc(${Math.random() * 100}vw)`,
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10,
          }}
          style={{
            boxShadow: '0 0 10px 2px rgba(96, 165, 250, 0.5)',
          }}
        />
      ))}
    </div>
  );
};

// --- Auth Screens ---
const AuthScreen = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [iin, setIin] = useState('');
  const [error, setError] = useState('');
  const setUser = useStore(state => state.setUser);

  const handleSendCode = () => {
    if (!email.includes('@')) return setError('Invalid email');
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(newCode);
    setStep(2);
    setError('');
  };

  const handleVerifyCode = () => {
    if (code !== generatedCode) return setError('Invalid code');
    setStep(3);
    setError('');
  };

  const handleRegister = async () => {
    if (!username || !password) return setError('Fill all fields');
    if (isTeacher && iin.length !== 12) return setError('IIN must be 12 digits');
    
    try {
      let id = uuidv4();
      
      if (auth) {
        // 1. Register with Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        id = firebaseUser.uid;
      }
      
      const role = isTeacher ? 'teacher' : 'student';
      
      // 2. Register in SQLite
      const res = await api.post('/api/auth/register', { id, email, username, password, role, iin });
      if (res.success) {
        const loginRes = await api.post('/api/auth/login', { id, email });
        if (loginRes.success) {
          setUser(loginRes.user);
        }
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogin = async () => {
    try {
      let id = '';
      if (auth) {
        // 1. Login with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        id = firebaseUser.uid;
      } else {
        // If no Firebase, we just use email to find the user in SQLite
        // We'll need to modify the login endpoint to accept email/password or just email for this mock
        // For now, we'll just pass email and a dummy id, the backend will check it
      }
      
      // 2. Login in SQLite
      const res = await api.post('/api/auth/login', { id, email, password });
      if (res.success) {
        setUser(res.user);
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A2540] to-[#1E3A8A] flex items-center justify-center relative overflow-hidden">
      <ParticlesBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
            <span className="text-3xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">AqboHub</h1>
          <p className="text-blue-200 text-sm">Знания = Валюта. Учись. Помогай. Зарабатывай.</p>
        </div>

        {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-xl mb-4 text-sm text-center border border-red-500/30">{error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password (for login)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <div className="flex gap-4">
              <button 
                onClick={handleLogin}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all"
              >
                Войти
              </button>
              <button 
                onClick={handleSendCode}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
              >
                Регистрация
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-xl mb-6">
              <p className="text-blue-200 text-sm mb-1">Код для тестирования:</p>
              <p className="text-3xl font-mono font-bold text-white tracking-widest">{generatedCode}</p>
            </div>
            <input
              type="text"
              placeholder="Введите код"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={4}
            />
            <button 
              onClick={handleVerifyCode}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              Подтвердить
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Имя пользователя"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Придумайте пароль"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            
            <label className="flex items-center gap-3 text-blue-200 cursor-pointer p-2 bg-white/5 rounded-xl border border-white/5">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isTeacher}
                onChange={e => setIsTeacher(e.target.checked)}
              />
              <span>Я учитель</span>
            </label>

            {isTeacher && (
              <input
                type="text"
                placeholder="Введите ИИН (12 цифр)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={iin}
                onChange={e => setIin(e.target.value)}
                maxLength={12}
              />
            )}

            <label className="flex items-center gap-3 text-blue-200 cursor-pointer p-3 bg-white/5 rounded-xl border border-white/10 mt-2">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span>Я не робот</span>
            </label>

            <button 
              onClick={handleRegister}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all mt-4"
            >
              Завершить регистрацию
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Onboarding ---
const Onboarding = () => {
  const user = useStore(state => state.user);
  const updateUser = useStore(state => state.updateUser);
  const [step, setStep] = useState(1);
  const [userClass, setUserClass] = useState('');
  const [strongSubjects, setStrongSubjects] = useState<string[]>([]);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Generate initial rating via Gemini (simulated here, but we have the service)
      // For this demo, we'll just assign a random rating between 1.8 and 2.7
      const rating = (Math.random() * (2.7 - 1.8) + 1.8).toFixed(1);
      
      const res = await api.post(`/api/users/${user?.id}/onboard`, {
        class: userClass,
        strongSubjects,
        weakSubjects,
        subjectPercentages: percentages,
        bio,
        rating: parseFloat(rating)
      });
      
      if (res.success) {
        updateUser(res.user);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Настройка профиля</h2>
          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Шаг {step} из 5</span>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-700">В каком вы классе?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['7 класс', '8 класс', '9 класс', '10 класс', '11 класс'].map(c => (
                <button
                  key={c}
                  onClick={() => setUserClass(c)}
                  className={`p-4 rounded-2xl border-2 transition-all ${userClass === c ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 hover:border-blue-300 text-gray-600'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setStep(2)} 
              disabled={!userClass}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium disabled:opacity-50 mt-8"
            >
              Далее
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-700">Ваши сильные предметы</h3>
            <p className="text-sm text-gray-500">Выберите предметы, в которых вы разбираетесь хорошо.</p>
            <div className="flex flex-wrap gap-3">
              {subjectsList.map(s => (
                <button
                  key={s}
                  onClick={() => setStrongSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`px-6 py-3 rounded-full border-2 transition-all ${strongSubjects.includes(s) ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200 hover:border-green-300 text-gray-600'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Назад</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-medium">Далее</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-700">Предметы для подтягивания</h3>
            <p className="text-sm text-gray-500">Выберите предметы, с которыми вам нужна помощь.</p>
            <div className="flex flex-wrap gap-3">
              {subjectsList.filter(s => !strongSubjects.includes(s)).map(s => (
                <button
                  key={s}
                  onClick={() => setWeakSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`px-6 py-3 rounded-full border-2 transition-all ${weakSubjects.includes(s) ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-gray-200 hover:border-red-300 text-gray-600'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Назад</button>
              <button onClick={() => setStep(4)} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-medium">Далее</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-700">Оцените свои знания</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {[...strongSubjects, ...weakSubjects].map(s => (
                <div key={s} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="font-medium text-gray-800 mb-3">{s} <span className="text-sm font-normal text-gray-500">({strongSubjects.includes(s) ? 'Сильный' : 'Слабый'})</span></p>
                  <div className="flex gap-2">
                    {(strongSubjects.includes(s) ? [70, 80, 90, 100] : [40, 50, 60, 70]).map(pct => (
                      <button
                        key={pct}
                        onClick={() => setPercentages(prev => ({ ...prev, [s]: pct }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${percentages[s] === pct ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(3)} className="px-6 py-4 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Назад</button>
              <button onClick={() => setStep(5)} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-medium">Далее</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-700">О себе и целях</h3>
            <textarea
              placeholder="Напишите немного о себе, своих увлечениях и целях в учёбе..."
              className="w-full h-40 p-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 resize-none transition-all"
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(4)} className="px-6 py-4 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Назад</button>
              <button 
                onClick={handleComplete} 
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-medium shadow-lg shadow-blue-500/30 flex justify-center items-center"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Завершить и получить рейтинг'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Leaderboard ---
const Leaderboard = ({ onUserClick }: { onUserClick: (id: string) => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    api.get('/api/users').then(data => {
      if (Array.isArray(data)) {
        setUsers([...data].sort((a: User, b: User) => (b.rating || 0) - (a.rating || 0)));
      }
    });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto dark:text-white h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Trophy className="text-yellow-500" size={32} />
        Рейтинг Лицея
      </h2>
      <div className="bg-white dark:bg-[#1E2937] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        {users.map((u, i) => (
          <div 
            key={u.id} 
            onClick={() => onUserClick(u.id)}
            className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 font-bold text-gray-400 text-center">{i + 1}</div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                {u.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{u.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{u.class}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RankBadge rating={u.rating} />
              <div className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">{(u.rating || 0).toFixed(1)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Store ---
const Store = () => {
  const user = useStore(state => state.user);
  const updateUser = useStore(state => state.updateUser);
  const [buying, setBuying] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handleBuyPro = async () => {
    if (!user || user.coins < 1500) return alert('Недостаточно коинов');
    setBuying('pro');
    try {
      await api.post(`/api/users/${user.id}/coins`, { amount: -1500 });
      const res = await api.post(`/api/users/${user.id}/pro`, {});
      if (res.success) updateUser(res.user);
    } catch (e) {
      console.error(e);
    }
    setBuying(null);
  };

  const handleBuyCoins = (amount: number) => {
    setSelectedAmount(amount);
    setShowCardForm(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || cardNumber.length < 16 || expiry.length < 5 || cvv.length < 3) return alert('Заполните все поля карты');
    setBuying('coins');
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await api.post(`/api/users/${user.id}/coins`, { amount: selectedAmount });
      if (res.success) updateUser(res.user);
      setShowCardForm(false);
      setCardNumber('');
      setExpiry('');
      setCvv('');
    } catch (e) {
      console.error(e);
    }
    setBuying(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <ShoppingCart className="text-blue-500" size={32} />
        Магазин
      </h2>
      <div className="mb-8">
        <p className="text-gray-500 dark:text-gray-400 mb-2">Ваш баланс: <span className="font-bold text-yellow-600 dark:text-yellow-500">{user?.coins} 🪙</span></p>
        {!user?.isPro && (
          <div className="w-full max-w-md">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Прогресс до PRO</span>
              <span>{Math.min(user?.coins || 0, 1500)} / 1500 🪙</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((user?.coins || 0) / 1500) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <h3 className="text-2xl font-bold mb-2">PRO версия AqboHub</h3>
          <p className="text-purple-200 mb-6">Безлимитный чат с ИИ, генерация конспектов и загрузка фото.</p>
          <div className="text-4xl font-black mb-8">1500 🪙</div>
          <button 
            onClick={handleBuyPro}
            disabled={buying === 'pro' || user?.isPro}
            className="w-full bg-white text-indigo-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {user?.isPro ? 'Уже куплено' : buying === 'pro' ? 'Покупка...' : 'Купить PRO'}
          </button>
        </div>
        
        <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="text-xl font-bold mb-6">Пополнить баланс</h3>
          
          {showCardForm ? (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handlePayment} 
              className="space-y-4"
            >
              <div className="bg-gradient-to-tr from-gray-800 to-gray-900 p-6 rounded-2xl text-white shadow-lg mb-6">
                <div className="flex justify-between items-center mb-6">
                  <CreditCard size={32} className="text-gray-400" />
                  <span className="font-mono text-lg">{selectedAmount} 🪙</span>
                </div>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-transparent border-b border-gray-600 focus:border-blue-400 outline-none font-mono text-xl mb-6 tracking-widest"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                />
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-1/2 bg-transparent border-b border-gray-600 focus:border-blue-400 outline-none font-mono tracking-widest"
                    value={expiry}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                      setExpiry(val);
                    }}
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    className="w-1/2 bg-transparent border-b border-gray-600 focus:border-blue-400 outline-none font-mono tracking-widest"
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCardForm(false)}
                  className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={buying === 'coins'}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {buying === 'coins' ? 'Оплата...' : 'Оплатить'}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-white/10 rounded-2xl">
                <div>
                  <p className="font-bold text-lg">500 🪙</p>
                  <p className="text-sm text-gray-500">1000 ₸</p>
                </div>
                <button 
                  onClick={() => handleBuyCoins(500)}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-6 py-2 rounded-xl font-medium hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                >
                  Купить
                </button>
              </div>
              <div className="flex justify-between items-center p-4 border border-blue-500 rounded-2xl bg-blue-50 dark:bg-blue-900/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Популярно</div>
                <div>
                  <p className="font-bold text-lg">1500 🪙</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">2500 ₸ <span className="line-through text-gray-400 text-xs ml-1">3000 ₸</span></p>
                </div>
                <button 
                  onClick={() => handleBuyCoins(1500)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Купить
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Tutors ---
const Tutors = ({ onUserClick }: { onUserClick: (id: string) => void }) => {
  const [tutors, setTutors] = useState<User[]>([]);
  
  useEffect(() => {
    api.get('/api/users').then(data => {
      if (Array.isArray(data)) {
        setTutors(data.filter((u: User) => (u.rating || 0) >= 4.0));
      }
    });
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Users className="text-green-500" size={32} />
        Свободные Тьюторы
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Ученики с рейтингом 4.0+, готовые помочь.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutors.map(t => (
          <div 
            key={t.id}
            onClick={() => onUserClick(t.id)}
            className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xl group-hover:scale-110 transition-transform">
                {t.username?.[0]?.toUpperCase()}
              </div>
              <RankBadge rating={t.rating} />
            </div>
            <h3 className="font-bold text-lg mb-1">{t.username}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{t.bio || 'Готов помочь с учебой!'}</p>
            <div className="flex flex-wrap gap-2">
              {t.strongSubjects?.slice(0, 3).map(s => (
                <span key={s} className="text-xs font-medium bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md text-gray-600 dark:text-gray-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Tasks ---
const Tasks = () => {
  const user = useStore(state => state.user);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [coins, setCoins] = useState(50);
  const [dueDate, setDueDate] = useState('');

  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDueDate, setFilterDueDate] = useState('All');

  const [reviewModal, setReviewModal] = useState<{ taskId: string, tutorId: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const loadTasks = () => {
    api.get('/api/tasks').then((data: any[]) => {
      data.sort((a, b) => b.coins - a.coins);
      setTasks(data);
    });
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const uniqueSubjects = ['All', ...Array.from(new Set(tasks.map(t => t.subject).filter(Boolean)))];
  
  const filteredTasks = tasks.filter(t => {
    const matchSubject = filterSubject === 'All' || t.subject === filterSubject;
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    let matchDueDate = true;
    if (filterDueDate !== 'All') {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (filterDueDate === 'overdue') matchDueDate = t.dueDate && t.dueDate < today;
      else if (filterDueDate === 'today') matchDueDate = t.dueDate === today;
      else if (filterDueDate === 'upcoming') matchDueDate = t.dueDate && t.dueDate > today;
    }
    return matchSubject && matchStatus && matchDueDate;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description || !subject) return;
    if (user.coins < coins) return alert('Недостаточно коинов');

    try {
      const res = await api.post('/api/tasks', {
        id: uuidv4(),
        title,
        description,
        subject,
        authorId: user.id,
        coins,
        dueDate
      });
      
      if (res.success) {
        useStore.getState().updateUser(res.user);
        setShowNewTask(false);
        setTitle('');
        setDescription('');
        setSubject('');
        setCoins(50);
        setDueDate('');
        loadTasks();
      } else {
        alert(res.error || 'Ошибка при создании задачи');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTakeTask = async (taskId: string) => {
    if (!user) return;
    try {
      await api.post(`/api/tasks/${taskId}/take`, { tutorId: user.id });
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteTask = async (taskId: string, tutorId: string) => {
    setReviewModal({ taskId, tutorId });
  };

  const submitReview = async () => {
    if (!user || !reviewModal) return;
    try {
      // Add coins to tutor
      await api.post(`/api/users/${reviewModal.tutorId}/coins`, { amount: coins });
      // Complete task and increase tutor rating
      const ratingIncrease = (reviewRating - 3) * 0.1; // -0.2 to +0.2 based on 1-5 stars
      await api.post(`/api/tasks/${reviewModal.taskId}/complete`, { 
        ratingIncrease, 
        tutorId: reviewModal.tutorId,
        review: {
          rating: reviewRating,
          text: reviewText,
          authorId: user.id,
          authorName: user.username
        }
      });
      setReviewModal(null);
      setReviewRating(5);
      setReviewText('');
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <CheckSquare className="text-blue-500" size={32} />
          Доска задач
        </h2>
        <div className="flex items-center gap-4">
          <select
            className="bg-white dark:bg-[#1E2937] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">Все статусы</option>
            <option value="open">Открытые</option>
            <option value="in_progress">В процессе</option>
            <option value="completed">Завершенные</option>
          </select>
          <select
            className="bg-white dark:bg-[#1E2937] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={filterDueDate}
            onChange={e => setFilterDueDate(e.target.value)}
          >
            <option value="All">Любой срок</option>
            <option value="overdue">Просроченные</option>
            <option value="today">На сегодня</option>
            <option value="upcoming">Предстоящие</option>
          </select>
          <select
            className="bg-white dark:bg-[#1E2937] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
          >
            {uniqueSubjects.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'Все предметы' : s}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowNewTask(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus size={20} />
            Создать задачу
          </button>
        </div>
      </div>

      {showNewTask && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 mb-8"
        >
          <h3 className="text-xl font-bold mb-4">Новая задача</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <input
              type="text"
              placeholder="Тема (например: Помогите с логарифмами)"
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="Подробное описание задачи..."
              className="w-full h-32 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Предмет</label>
                <select
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                >
                  <option value="">Выберите предмет</option>
                  {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Вознаграждение (🪙)</label>
                <input
                  type="number"
                  min="10"
                  max={user?.coins || 0}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={coins}
                  onChange={e => setCoins(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Срок (опционально)</label>
                <input
                  type="date"
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
              <div className="flex-1 flex gap-2 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-500 transition-colors"
                >
                  Опубликовать
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center">
            <p className="text-gray-500 dark:text-gray-400">Пока нет активных задач.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  task.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {task.status === 'open' ? 'Открыта' : task.status === 'in_progress' ? 'В процессе' : 'Завершена'}
                </span>
                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg text-yellow-700 dark:text-yellow-500 font-bold text-sm">
                  {task.coins} 🪙
                </div>
              </div>
              
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    task.status === 'completed' ? 'bg-green-500 w-full' : 
                    task.status === 'in_progress' ? 'bg-blue-500 w-1/2' : 
                    'bg-gray-300 dark:bg-gray-600 w-[10%]'
                  }`}
                />
              </div>

              <h3 className="font-bold text-lg mb-2">{task.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 flex-1 line-clamp-3">{task.description}</p>
              
              {task.dueDate && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                  <Calendar size={16} />
                  <span>Срок: {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              
              {task.status === 'open' && task.authorId !== user?.id && user?.rating && user.rating >= 4.0 && (
                <button 
                  onClick={() => handleTakeTask(task.id)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Взять задачу
                </button>
              )}
              {task.status === 'in_progress' && task.authorId === user?.id && (
                <button 
                  onClick={() => handleCompleteTask(task.id, task.tutorId)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Подтвердить выполнение
                </button>
              )}
              {task.status === 'open' && task.authorId === user?.id && (
                <button 
                  disabled
                  className="w-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed"
                >
                  Ожидает тьютора
                </button>
              )}
              {task.status === 'completed' && (
                <button 
                  disabled
                  className="w-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed"
                >
                  Задача завершена
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-2xl max-w-md w-full"
          >
            <h3 className="text-2xl font-bold mb-4">Оцените тьютора</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Как прошло занятие? Ваша оценка поможет другим ученикам.</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={`text-4xl transition-transform hover:scale-110 ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="Напишите отзыв (необязательно)..."
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-6 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
            />
            
            <div className="flex gap-4">
              <button 
                onClick={() => setReviewModal(null)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={submitReview}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Оценить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// --- Knowledge Modules ---
const KnowledgeModules = () => {
  const user = useStore(state => state.user);
  const [modules, setModules] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadModules = async () => {
    const data = await api.get('/api/modules');
    setModules(data);
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description || !content || !subject) return;

    try {
      const res = await api.post('/api/modules', {
        id: uuidv4(),
        title,
        description,
        content,
        subject,
        authorId: user.id
      });
      if (res.success) {
        useStore.getState().updateUser(res.user);
        setShowNew(false);
        setTitle('');
        setDescription('');
        setContent('');
        setSubject('');
        loadModules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLike = async (id: string) => {
    await api.post(`/api/modules/${id}/like`, {});
    loadModules();
  };

  const filteredModules = modules.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileText className="text-orange-500" size={32} />
            Модули знаний
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Изучайте материалы или создавайте свои (+50 🪙 за модуль)</p>
        </div>
        <button 
          onClick={() => setShowNew(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
        >
          <Plus size={20} />
          Создать модуль
        </button>
      </div>

      <div className="mb-8 relative">
        <input 
          type="text" 
          placeholder="Поиск модулей по названию, предмету или описанию..." 
          className="w-full bg-white dark:bg-[#1E2937] border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 pl-12 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      {showNew && (
        <motion.form 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateModule} 
          className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-white/5 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Новый модуль знаний</h3>
            <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <input 
              type="text" 
              placeholder="Название модуля" 
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <select 
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            >
              <option value="">Выберите предмет</option>
              {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Краткое описание" 
            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-6"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
          <textarea 
            placeholder="Содержание модуля (текст, ссылки, материалы)..." 
            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 h-40 resize-none mb-6"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-600/30 transition-all">
            Опубликовать модуль
          </button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredModules.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1E2937] rounded-3xl border border-gray-100 dark:border-white/5">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Модули не найдены</p>
          </div>
        ) : (
          filteredModules.map(module => (
            <div key={module.id} className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold rounded-full border border-orange-200 dark:border-orange-800/50">
                  {module.subject}
                </span>
                <button 
                  onClick={() => handleLike(module.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <span className="text-sm font-medium">{module.likes}</span>
                </button>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">{module.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 flex-1">{module.description}</p>
              <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 border border-gray-100 dark:border-white/5">
                {module.content}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-auto">
                Автор: {module.authorId === user?.id ? 'Вы' : 'Другой ученик'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Slots ---
const Slots = () => {
  const user = useStore(state => state.user);
  const [slots, setSlots] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const times = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  useEffect(() => {
    if (user) {
      api.get('/api/slots').then(data => {
        const userSlots = data.filter((s: any) => s.userId === user.id);
        const slotsMap: Record<string, boolean> = {};
        userSlots.forEach((s: any) => {
          slotsMap[`${s.day}-${s.time}`] = s.isAvailable === 1;
        });
        setSlots(slotsMap);
      });
    }
  }, [user]);

  useEffect(() => {
    if (viewMode === 'all') {
      api.get('/api/slots').then(setAllSlots);
      api.get('/api/users').then(data => {
        const userMap: Record<string, User> = {};
        data.forEach((u: User) => {
          userMap[u.id] = u;
        });
        setUsers(userMap);
      });
    }
  }, [viewMode]);

  const toggleSlot = async (day: string, time: string) => {
    if (!user) return;
    const key = `${day}-${time}`;
    const isAvailable = !slots[key];
    setSlots(prev => ({ ...prev, [key]: isAvailable }));
    
    try {
      await api.post('/api/slots', {
        id: uuidv4(),
        userId: user.id,
        day,
        time,
        isAvailable: isAvailable ? 1 : 0
      });
    } catch (e) {
      console.error(e);
      // Revert on error
      setSlots(prev => ({ ...prev, [key]: !isAvailable }));
    }
  };

  const blockTutorSlot = async (slotId: string) => {
    if (user?.role !== 'teacher') return;
    if (!confirm('Вы уверены, что хотите заблокировать этот слот?')) return;
    
    try {
      // Find the slot to get its details
      const slotToBlock = allSlots.find(s => s.id === slotId);
      if (!slotToBlock) return;

      await api.post('/api/slots', {
        id: slotToBlock.id,
        userId: slotToBlock.userId,
        day: slotToBlock.day,
        time: slotToBlock.time,
        isAvailable: 0
      });
      
      // Update local state
      setAllSlots(prev => prev.map(s => s.id === slotId ? { ...s, isAvailable: 0 } : s));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="text-blue-500" size={32} />
          Слоты
        </h2>
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'my' ? 'bg-white dark:bg-[#1E2937] text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Мои слоты
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'all' ? 'bg-white dark:bg-[#1E2937] text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Все тьюторы
          </button>
        </div>
      </div>
      
      {viewMode === 'my' ? (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Укажите время, когда вы готовы помогать другим ученикам.</p>
          <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-8 gap-4 mb-4">
                <div className="font-medium text-gray-500 dark:text-gray-400 text-center">Время</div>
                {days.map(d => (
                  <div key={d} className="font-bold text-center text-gray-900 dark:text-white">{d}</div>
                ))}
              </div>
              
              {times.map(time => (
                <div key={time} className="grid grid-cols-8 gap-4 mb-4 items-center">
                  <div className="font-mono text-sm text-gray-500 dark:text-gray-400 text-center">{time}</div>
                  {days.map(day => {
                    const isAvailable = slots[`${day}-${time}`];
                    return (
                      <button
                        key={`${day}-${time}`}
                        onClick={() => toggleSlot(day, time)}
                        className={`h-12 rounded-xl border-2 transition-all ${
                          isAvailable 
                            ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/30' 
                            : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Расписание доступных тьюторов на неделю. {user?.role === 'teacher' && 'Нажмите на тьютора, чтобы заблокировать слот.'}</p>
          <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-4 mb-4">
                <div className="font-medium text-gray-500 dark:text-gray-400 text-center">Время</div>
                {days.map(d => (
                  <div key={d} className="font-bold text-center text-gray-900 dark:text-white">{d}</div>
                ))}
              </div>
              
              {times.map(time => (
                <div key={time} className="grid grid-cols-8 gap-4 mb-4">
                  <div className="font-mono text-sm text-gray-500 dark:text-gray-400 text-center flex items-center justify-center">{time}</div>
                  {days.map(day => {
                    const availableTutors = allSlots.filter(s => s.day === day && s.time === time && s.isAvailable === 1 && users[s.userId]);
                    return (
                      <div key={`${day}-${time}`} className="min-h-[60px] p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col gap-1">
                        {availableTutors.map(s => {
                          const tutor = users[s.userId];
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => blockTutorSlot(s.id)}
                              className={`text-xs px-2 py-1 rounded truncate ${user?.role === 'teacher' ? 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400' : ''} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`} 
                              title={tutor.username}
                            >
                              {tutor.username}
                            </div>
                          );
                        })}
                        {availableTutors.length === 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">-</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Teacher Board ---
const TeacherBoard = () => {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/tasks').then(setTasks);
  }, []);

  const handleDeleteTask = async (id: string) => {
    await api.delete(`/api/tasks/${id}`);
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Presentation className="text-blue-500" size={32} />
        Панель учителя
      </h2>
      <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
        <h3 className="text-xl font-bold mb-6">Модерация задач</h3>
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-xl">
              <div>
                <h4 className="font-bold">{task.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
              </div>
              <button 
                onClick={() => handleDeleteTask(task.id)}
                className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
              >
                Удалить
              </button>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-gray-500 dark:text-gray-400">Нет задач для модерации.</p>}
        </div>
      </div>
    </div>
  );
};

// --- Class Control ---
const ClassControl = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAlerts(prev => ['Обнаружено использование телефона (Ученик #4)', ...prev]);
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto dark:text-white h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Camera className="text-blue-500" size={32} />
        Камеры
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Камера 1 (Кабинет 302)</h3>
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {analyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Bot size={16} />}
              Анализ ИИ
            </button>
          </div>
          <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden border border-gray-800">
            <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
            </div>
            <img 
              src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1000" 
              alt="Classroom" 
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            {analyzing && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                <div className="w-full h-1 bg-blue-400/50 absolute top-0 animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="text-xl font-bold mb-4">Уведомления ИИ</h3>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-3 rounded-xl flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{alert}</p>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">Нарушений не обнаружено</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeDashboard = ({ setCurrentTab }: { setCurrentTab: (t: string) => void }) => {
  const user = useStore(state => state.user);
  const [prediction, setPrediction] = useState<{ profession: string, income: string, description: string, icon: string } | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchPrediction = async () => {
        setLoadingPrediction(true);
        const strong = user.strongSubjects || [];
        const weak = user.weakSubjects || [];
        const result = await predictFuture(strong, weak);
        setPrediction(result);
        setLoadingPrediction(false);
      };
      fetchPrediction();
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="p-8 overflow-y-auto h-full dark:text-white bg-gray-50 dark:bg-[#0F172A]">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-black mb-2 tracking-tight">С возвращением, {user.username}! 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Ваш текущий рейтинг: <span className="font-bold text-blue-600 dark:text-blue-400">{(user.rating || 0).toFixed(1)}</span></p>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-xl flex-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <h3 className="text-lg font-bold mb-1 opacity-90">Баланс знаний</h3>
          <div className="text-4xl font-black mb-2">{user.coins} 🪙</div>
          <p className="text-sm opacity-80 mb-4">Зарабатывайте коины, помогая другим и создавая модули.</p>
          
          <div className="mt-2">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>До статуса PRO</span>
              <span>{Math.min(user.coins, 1500)} / 1500 🪙</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5">
              <div 
                className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((user.coins / 1500) * 100, 100)}%` }}
              ></div>
            </div>
            {user.coins >= 1500 && (
              <p className="text-xs text-yellow-300 mt-1 font-bold">Вы достигли статуса PRO! 🎉</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Bot className="text-purple-500" /> Анализ будущего от ИИ
      </h2>
      <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 mb-8 relative overflow-hidden min-h-[200px] flex flex-col justify-center">
        {loadingPrediction ? (
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>ИИ анализирует ваш профиль...</p>
          </div>
        ) : prediction ? (
          <>
            <div className="absolute top-0 right-0 p-8 text-8xl opacity-5">{prediction.icon}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Рекомендуемая профессия</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{prediction.profession}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Потенциальный доход</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{prediction.income}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-2">Что из вас выйдет</p>
                <p className="text-lg text-gray-700 dark:text-gray-300 border-l-4 border-blue-500 pl-4 py-1">{prediction.description}</p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-500">💪</span> Сильные предметы
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.strongSubjects?.map((subject: string) => (
              <span key={subject} className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-xl text-sm font-medium">
                {subject}
              </span>
            )) || <span className="text-gray-500">Не указано</span>}
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#1E2937] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-red-500">🎯</span> Зоны роста (Слабые предметы)
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.weakSubjects?.map((subject: string) => (
              <span key={subject} className="px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium">
                {subject}
              </span>
            )) || <span className="text-gray-500">Не указано</span>}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Быстрый доступ</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div 
          onClick={() => setCurrentTab('tasks')}
          className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <CheckSquare size={28} />
          </div>
          <h3 className="text-xl font-bold mb-1">Задачи</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Выполняйте задания и повышайте рейтинг</p>
        </div>
        <div 
          onClick={() => setCurrentTab('modules')}
          className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
            <FileText size={28} />
          </div>
          <h3 className="text-xl font-bold mb-1">Модули знаний</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Создавайте и изучайте полезные материалы</p>
        </div>
        <div 
          onClick={() => setCurrentTab('ai')}
          className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Bot size={28} />
          </div>
          <h3 className="text-xl font-bold mb-1">ИИ Помощник</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ваш личный тьютор всегда на связи</p>
        </div>
        <div 
          onClick={() => setCurrentTab('tutors')}
          className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
            <Users size={28} />
          </div>
          <h3 className="text-xl font-bold mb-1">Тьюторы</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Найдите помощь у лучших учеников</p>
        </div>
        <div 
          onClick={() => setCurrentTab('users')}
          className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Users size={28} />
          </div>
          <h3 className="text-xl font-bold mb-1">Все пользователи</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Список учеников и тьюторов</p>
        </div>
      </div>
    </div>
  );
};

const UsersList = ({ onUserClick }: { onUserClick: (id: string) => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/api/users').then(setUsers);
  }, []);

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto dark:text-white h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Users className="text-emerald-500" size={32} />
          Все пользователи
        </h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Поиск пользователей..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E2937] focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <div 
            key={u.id}
            onClick={() => onUserClick(u.id)}
            className="bg-white dark:bg-[#1E2937] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex items-center gap-4"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xl shrink-0 border border-emerald-200 dark:border-emerald-800/50">
              {u.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white">{u.username}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{u.role}</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <RankBadge rating={u.rating} />
              </div>
              {u.class && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{u.class}</p>}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            Пользователи не найдены
          </div>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({ currentTab, setCurrentTab, onAvatarClick }: { currentTab: string, setCurrentTab: (t: string) => void, onAvatarClick: () => void }) => {
  const user = useStore(state => state.user);
  const theme = useStore(state => state.theme);
  
  const menuItems = [
    { id: 'home', icon: Home, label: 'Главная' },
    { id: 'tasks', icon: CheckSquare, label: 'Задачи' },
    { id: 'slots', icon: Calendar, label: 'Слоты' },
    { id: 'ai', icon: Bot, label: 'ИИ Помощник' },
    { id: 'leaderboard', icon: Trophy, label: 'Рейтинг' },
    { id: 'store', icon: ShoppingCart, label: 'Магазин' },
    { id: 'tutors', icon: Users, label: 'СВОБОДНЫЕ ТЬЮТОРЫ' },
    { id: 'users', icon: Users, label: 'Пользователи' },
  ];

  if (user?.role === 'teacher') {
    menuItems.push({ id: 'teacher-board', icon: Presentation, label: 'Для учителей' });
    menuItems.push({ id: 'class-control', icon: Camera, label: 'Камеры' });
  }

  return (
    <div className="w-[260px] h-screen bg-[#0A2540] flex flex-col flex-shrink-0 border-r border-white/10">
      <div className="p-6 flex flex-col items-center border-b border-white/10">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
          <span className="text-2xl font-bold text-white">A</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">AqboHub</h1>
        <p className="text-[10px] text-blue-200/70 uppercase tracking-widest mt-1">Лицей Акбобек</p>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-blue-300'} />
              <span className={`font-medium ${item.id === 'tutors' ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={() => setCurrentTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            currentTab === 'settings' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Settings size={20} />
          <span className="font-medium text-sm">Настройки</span>
        </button>
        
        {user && (
          <div 
            onClick={onAvatarClick}
            className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white font-bold text-sm">{user.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-blue-200/70 truncate">{user.role === 'teacher' ? 'Учитель' : 'Ученик'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- AI Assistant ---
type AiMode = 'chat' | 'search' | 'fast' | 'think' | 'image' | 'vision' | 'video' | 'audio' | 'exam';

const AiAssistant = () => {
  const user = useStore(state => state.user);
  const aiHistory = useStore(state => state.aiHistory);
  const addAiMessage = useStore(state => state.addAiMessage);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AiMode>('chat');
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const history = user ? (aiHistory[user.id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleSend = async (textToSend?: string) => {
    const text = typeof textToSend === 'string' ? textToSend : input;
    if ((!text.trim() && !file) || !user) return;
    
    let mediaUrl;
    let mediaType: 'image' | 'video' | 'audio' | undefined;
    
    if (file) {
      mediaUrl = URL.createObjectURL(file);
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
    }

    const userMsg: AiMessage = { 
      id: uuidv4(), 
      text, 
      sender: 'user', 
      timestamp: Date.now(),
      mediaUrl,
      mediaType
    };
    
    addAiMessage(user.id, userMsg);
    setInput('');
    setLoading(true);

    try {
      let responseText = '';
      let responseMediaUrl;
      let responseMediaType: 'image' | undefined;

      if (mode === 'chat') {
        const formattedHistory = history.map(h => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }));
        responseText = await chatWithAI(text, formattedHistory);
      } else if (mode === 'search') {
        responseText = await searchWeb(text);
      } else if (mode === 'fast') {
        responseText = await fastResponse(text);
      } else if (mode === 'think') {
        responseText = await thinkDeep(text);
      } else if (mode === 'exam') {
        responseText = await prepareForExam(text);
      } else if (mode === 'image') {
        const img = await generateImage(text);
        if (img) {
          responseText = "Вот ваше изображение:";
          responseMediaUrl = img;
          responseMediaType = 'image';
        } else {
          responseText = "Не удалось сгенерировать изображение.";
        }
      } else if (mode === 'vision' && file && mediaType === 'image') {
        const base64 = await fileToBase64(file);
        responseText = await analyzeImage(base64, file.type, text || "Что на этом изображении?");
      } else if (mode === 'video' && file && mediaType === 'video') {
        const base64 = await fileToBase64(file);
        responseText = await analyzeVideo(base64, file.type, text || "Проанализируй это видео.");
      } else if (mode === 'audio' && file && mediaType === 'audio') {
        const base64 = await fileToBase64(file);
        responseText = await transcribeAudio(base64, file.type);
      } else {
        responseText = "Пожалуйста, выберите правильный режим и прикрепите нужный файл.";
      }
      
      const aiMsg: AiMessage = { 
        id: uuidv4(), 
        text: responseText || "Я ИИ-помощник AqboHub. Чем могу помочь?", 
        sender: 'ai', 
        timestamp: Date.now(),
        mediaUrl: responseMediaUrl,
        mediaType: responseMediaType
      };
      addAiMessage(user.id, aiMsg);
    } catch (e) {
      console.error(e);
      addAiMessage(user.id, { id: uuidv4(), text: "Произошла ошибка.", sender: 'ai', timestamp: Date.now() });
    }
    
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(false);
  };

  const modes = [
    { id: 'chat', icon: MessageSquare, label: 'Чат (Pro)', description: 'Умный диалог с ИИ' },
    { id: 'search', icon: Search, label: 'Поиск', description: 'Поиск актуальной информации в сети' },
    { id: 'fast', icon: Zap, label: 'Быстрый', description: 'Мгновенные короткие ответы' },
    { id: 'think', icon: Brain, label: 'Разумный', description: 'Сложные задачи и рассуждения (6 агентов)' },
    { id: 'exam', icon: FileText, label: 'Подготовка к СОР/СОЧ', description: 'Генерация тестов и конспектов' },
    { id: 'image', icon: Sparkles, label: 'Генерация', description: 'Создание изображений по описанию' },
    { id: 'vision', icon: ImageIcon, label: 'Анализ фото', description: 'Распознавание текста и объектов' },
    { id: 'video', icon: Video, label: 'Анализ видео', description: 'Понимание видеоконтента' },
    { id: 'audio', icon: Mic, label: 'Транскрибация', description: 'Перевод аудио в текст' },
  ];

  const currentModeData = modes.find(m => m.id === mode) || modes[0];
  const CurrentModeIcon = currentModeData.icon;

  return (
    <div className="flex flex-col h-full bg-[#0F172A]">
      <div className="p-4 border-b border-white/10 bg-[#0A2540]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">ИИ Помощник</h2>
            <p className="text-blue-200/70 text-sm mt-1">Ваш персональный тьютор 24/7</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowModeSelect(!showModeSelect)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E2937] hover:bg-[#2D3748] border border-white/10 rounded-xl text-white font-medium transition-colors"
            >
              <CurrentModeIcon size={18} className="text-blue-400" />
              {currentModeData.label}
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showModeSelect ? 'rotate-180' : ''}`} />
            </button>
            
            {showModeSelect && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModeSelect(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-64 bg-[#1E2937] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {modes.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id as AiMode); setShowModeSelect(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${mode === m.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-200'}`}
                    >
                      <m.icon size={18} className={mode === m.id ? 'text-blue-400' : 'text-gray-400'} />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{m.label}</span>
                        <span className="text-xs text-gray-500">{m.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <Bot size={64} className="text-blue-400 mb-4" />
            <p className="text-white text-lg">Напишите что-нибудь, чтобы начать диалог</p>
          </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[70%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'user' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                {msg.sender === 'user' ? <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`p-4 rounded-2xl ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-[#1E2937] text-gray-200 rounded-tl-sm border border-white/5'
              }`}>
                {msg.mediaUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    {msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="Uploaded" className="max-w-full h-auto" />}
                    {msg.mediaType === 'video' && <video src={msg.mediaUrl} controls className="max-w-full h-auto" />}
                    {msg.mediaType === 'audio' && <audio src={msg.mediaUrl} controls className="max-w-full" />}
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-[#1E2937] p-4 rounded-2xl rounded-tl-sm border border-white/5 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-[#0A2540] border-t border-white/10">
        {file && (
          <div className="mb-4 p-3 bg-[#1E2937] border border-white/10 rounded-xl flex items-center justify-between">
            <span className="text-sm text-blue-200 truncate">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
          </div>
        )}
        <div className="relative flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={mode === 'vision' ? 'image/*' : mode === 'video' ? 'video/*' : mode === 'audio' ? 'audio/*' : '*/*'}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-4 text-blue-400 hover:text-blue-300"
          >
            <Upload size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={mode === 'vision' ? "Что на фото?" : mode === 'video' ? "Проанализируй видео" : mode === 'audio' ? "Транскрибируй аудио" : mode === 'exam' ? "Введите тему для подготовки к СОР/СОЧ..." : "Напишите сообщение..."}
            className="w-full bg-[#1E2937] border border-white/10 rounded-full py-4 pl-12 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <button 
            onClick={() => handleSend()}
            disabled={(!input.trim() && !file) || loading}
            className="absolute right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <Send size={18} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Chat Modal ---
const ChatModal = ({ userId, otherId, onClose }: { userId: string, otherId: string, onClose: () => void }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isWindowActive, setIsWindowActive] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = () => {
      setIsWindowActive(true);
      setHasNewMessage(false);
      // Mark unread messages as read
      const unreadIds = messages.filter(m => m.receiverId === userId && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0) {
        socket.emit('markMessagesRead', { messageIds: unreadIds, userId, senderId: otherId });
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));
      }
    };
    const handleBlur = () => setIsWindowActive(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [messages, userId, otherId]);

  useEffect(() => {
    api.get(`/api/users/${otherId}`).then(setOtherUser);
    
    // Load initial messages
    api.get(`/api/messages/${userId}/${otherId}`).then((data: any[]) => {
      setMessages(data);
      const unreadIds = data.filter(m => m.receiverId === userId && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0 && document.hasFocus()) {
        socket.emit('markMessagesRead', { messageIds: unreadIds, userId, senderId: otherId });
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));
      }
    });

    // Listen for new messages
    socket.on('newMessage', (msg) => {
      if ((msg.senderId === userId && msg.receiverId === otherId) || 
          (msg.senderId === otherId && msg.receiverId === userId)) {
        setMessages(prev => [...prev, msg]);
        
        if (msg.senderId === otherId) {
          if (!document.hasFocus()) {
            setHasNewMessage(true);
          } else {
            socket.emit('markMessagesRead', { messageIds: [msg.id], userId, senderId: otherId });
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
          }
        }
      }
    });

    socket.on('messagesRead', (messageIds: string[]) => {
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status: 'read' } : m));
    });

    return () => {
      socket.off('newMessage');
      socket.off('messagesRead');
    };
  }, [userId, otherId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = {
      id: uuidv4(),
      senderId: userId,
      receiverId: otherId,
      text: input,
      createdAt: Date.now(),
      status: 'sent'
    };
    socket.emit('sendMessage', msg);
    setInput('');
  };

  if (!otherUser) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden border transition-all duration-300 ${hasNewMessage ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-gray-200 dark:border-white/10'}`}
      >
        <div className="p-4 bg-gray-50 dark:bg-[#1E2937] border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
              {otherUser.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{otherUser.username}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">В сети</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white p-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0F172A]">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl ${
                msg.senderId === userId 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white dark:bg-[#1E2937] text-gray-900 dark:text-white rounded-tl-sm border border-gray-100 dark:border-white/5 shadow-sm'
              }`}>
                <p className="text-sm">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${msg.senderId === userId ? 'text-blue-200' : 'text-gray-400'}`}>
                  <span className="text-[10px]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.senderId === userId && (
                    msg.status === 'read' ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} className="text-blue-200" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-[#1E2937] border-t border-gray-200 dark:border-white/10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Сообщение..."
              className="w-full bg-gray-100 dark:bg-[#0F172A] border border-transparent dark:border-white/5 rounded-full py-3 pl-4 pr-12 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Profile Modal ---
const ProfileModal = ({ userId, onClose }: { userId: string, onClose: () => void }) => {
  const currentUser = useStore(state => state.user);
  const updateUser = useStore(state => state.updateUser);
  const [profile, setProfile] = useState<User | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editStrongSubjects, setEditStrongSubjects] = useState<string[]>([]);
  const [editWeakSubjects, setEditWeakSubjects] = useState<string[]>([]);

  useEffect(() => {
    api.get(`/api/users/${userId}`).then(setProfile);
    api.get(`/api/users/${userId}/reviews`).then(setReviews);
  }, [userId]);

  if (!profile) return null;

  if (showChat && currentUser) {
    return <ChatModal userId={currentUser.id} otherId={userId} onClose={() => setShowChat(false)} />;
  }

  const handleEdit = () => {
    setEditBio(profile.bio || '');
    setEditStrongSubjects(profile.strongSubjects || []);
    setEditWeakSubjects(profile.weakSubjects || []);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await api.post(`/api/users/${profile.id}/profile`, {
        bio: editBio,
        strongSubjects: editStrongSubjects,
        weakSubjects: editWeakSubjects
      });
      if (res.success) {
        setProfile(res.user);
        if (currentUser?.id === profile.id) {
          updateUser(res.user);
        }
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-0">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#1C2431] md:rounded-3xl shadow-2xl w-full md:max-w-md h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 p-2 rounded-full backdrop-blur-md transition-colors">
            <X size={20} />
          </button>
          {currentUser?.id === profile.id && !isEditing && (
            <button onClick={handleEdit} className="absolute top-4 left-4 text-white/80 hover:text-white bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md text-sm font-medium transition-colors">
              Редактировать
            </button>
          )}
        </div>
        <div className="px-6 pb-6 relative flex-1 overflow-y-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-full border-4 border-white dark:border-[#1C2431] absolute -top-12 flex items-center justify-center shadow-lg">
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{profile.username?.[0]?.toUpperCase()}</span>
          </div>
          
          <div className="flex justify-end mt-4 h-10">
            {currentUser?.id !== profile.id && (
              <button 
                onClick={() => setShowChat(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-md transition-transform hover:scale-105 flex items-center justify-center"
              >
                <MessageSquare size={20} />
              </button>
            )}
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.username}</h2>
              <RankBadge rating={profile.rating} />
            </div>
            <p className="text-blue-500 dark:text-blue-400 text-sm font-medium mt-1">
              {profile.role === 'teacher' ? 'Учитель' : 'Ученик'} • {profile.class || 'Класс не указан'}
            </p>
          </div>
          
          {isEditing ? (
            <div className="mt-6 space-y-5 bg-gray-50 dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">О себе</label>
                <textarea 
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2A3441] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none h-24 outline-none"
                  placeholder="Расскажите о себе..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Сильные предметы</label>
                <div className="flex flex-wrap gap-2">
                  {subjectsList.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStrongSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${editStrongSubjects.includes(s) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-white dark:bg-[#2A3441] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Слабые предметы</label>
                <div className="flex flex-wrap gap-2">
                  {subjectsList.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditWeakSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${editWeakSubjects.includes(s) ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' : 'bg-white dark:bg-[#2A3441] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 rounded-xl font-medium bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">Отмена</button>
                <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20">Сохранить</button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Info size={14} /> О себе
                </h3>
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{profile.bio || 'Информация не указана'}</p>
              </div>
              
              <div className="space-y-4">
                {profile.strongSubjects && profile.strongSubjects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Star size={14} className="text-yellow-500" /> Сильные предметы
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.strongSubjects.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-xl border border-green-200/50 dark:border-green-800/30">
                          {s} {profile.subjectPercentages?.[s] ? <span className="opacity-70 ml-1">{profile.subjectPercentages[s]}%</span> : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.weakSubjects && profile.weakSubjects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-500" /> Слабые предметы
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.weakSubjects.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-medium rounded-xl border border-red-200/50 dark:border-red-800/30">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(profile.rating || 0).toFixed(1)}</span>
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1 text-center">Рейтинг Лицея</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/30 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{reviews.length}</span>
                  <span className="text-xs font-medium text-purple-800 dark:text-purple-300 uppercase tracking-wider mt-1 text-center">Отзывов</span>
                </div>
              </div>

              {reviews.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-gray-400" /> Последние отзывы
                  </h3>
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-white dark:bg-[#2A3441] p-3 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">{review.authorName}</span>
                          <span className="text-yellow-500 text-xs">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        </div>
                        {review.text && <p className="text-gray-600 dark:text-gray-400 text-xs">{review.text}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentUser?.id !== profile.id && !isEditing && (
            <button 
              onClick={() => setShowChat(true)}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquare size={18} />
              Написать сообщение
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const user = useStore(state => state.user);
  const theme = useStore(state => state.theme);
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      socket.emit('join', user.id);
      
      const handlePush = (msg: string) => {
        alert(`Уведомление: ${msg}`);
      };
      
      socket.on('pushNotification', handlePush);
      return () => {
        socket.off('pushNotification', handlePush);
      };
    }
  }, [user]);

  if (!user) return <AuthScreen />;
  if (!user.onboarded) return <Onboarding />;

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} onAvatarClick={() => user && setSelectedUserId(user.id)} />
      
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A2540] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">
              {currentTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-700/50">
              <Star size={16} className="text-yellow-600 dark:text-yellow-500 fill-current" />
              <span className="font-bold text-yellow-700 dark:text-yellow-500">{user.coins}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-200 dark:border-blue-800 cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                <span className="text-blue-700 dark:text-blue-400 font-bold">{user.username?.[0]?.toUpperCase()}</span>
              </div>
              <RankBadge rating={user.rating} className="ml-1" />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {currentTab === 'ai' && <AiAssistant />}
          {currentTab === 'leaderboard' && <Leaderboard onUserClick={setSelectedUserId} />}
          {currentTab === 'store' && <Store />}
          {currentTab === 'tutors' && <Tutors onUserClick={setSelectedUserId} />}
          {currentTab === 'tasks' && <Tasks />}
          {currentTab === 'modules' && <KnowledgeModules />}
          {currentTab === 'slots' && <Slots />}
          {currentTab === 'teacher-board' && <TeacherBoard />}
          {currentTab === 'class-control' && <ClassControl />}
          {currentTab === 'home' && <HomeDashboard setCurrentTab={setCurrentTab} />}
          {currentTab === 'users' && <UsersList onUserClick={setSelectedUserId} />}

          {currentTab === 'settings' && (
            <div className="p-8 max-w-2xl mx-auto dark:text-white">
              <h2 className="text-2xl font-bold mb-6">Настройки</h2>
              <div className="bg-white dark:bg-[#1E2937] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Тёмная тема</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Переключить внешний вид приложения</p>
                  </div>
                  <button 
                    onClick={() => useStore.getState().setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`w-14 h-8 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <motion.div 
                      className="w-6 h-6 bg-white rounded-full shadow-md"
                      animate={{ x: theme === 'dark' ? 24 : 0 }}
                    />
                  </button>
                </div>
                <hr className="border-gray-100 dark:border-white/5" />
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => {
                      useStore.getState().setUser(null);
                      localStorage.removeItem('aqbohub-storage');
                    }}
                    className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                  >
                    <LogOut size={18} />
                    Выйти из аккаунта
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {selectedUserId && (
        <ProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
