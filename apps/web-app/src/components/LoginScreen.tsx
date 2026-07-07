import { useState, useEffect } from 'react';
import { ChevronRight, Key, Mail, User, Eye, EyeOff } from 'lucide-react';

export interface SessionUser {
  name: string;
  email: string;
  avatar: string;
  role: 'client' | 'provider';
  appMode: 'demo' | 'real';
  apiUrl: string;
  providerConfig?: any;
}

interface LoginScreenProps {
  onLogin: (user: SessionUser) => void;
}

// Cuentas Google demo iniciales
const DEFAULT_GOOGLE_ACCOUNTS = [
  {
    name: 'Deyvid Oficial',
    email: 'deyvid@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
  },
  {
    name: 'Lucas Díaz',
    email: 'lucas@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
  },
  {
    name: 'Ana Bertolini',
    email: 'ana@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
  },
];

type Step = 'login' | 'role';
type AuthMode = 'google' | 'credentials' | 'register';

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep] = useState<Step>('login');
  const [authMode, setAuthMode] = useState<AuthMode>('google');
  
  // Lista dinámica de cuentas (cargada de localStorage)
  const [accounts, setAccounts] = useState<typeof DEFAULT_GOOGLE_ACCOUNTS>([]);
  
  const [selectedAccount, setSelectedAccount] = useState<typeof DEFAULT_GOOGLE_ACCOUNTS[0] | null>(null);
  const [selectedRole, setSelectedRole] = useState<'client' | 'provider' | null>(null);
  const [appMode, setAppMode] = useState<'demo' | 'real'>('demo');
  const [apiUrl, setApiUrl] = useState('http://localhost:3000');

  // Formulario de Credenciales
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Formulario de Registro
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'client' | 'provider'>('client');
  const [regError, setRegError] = useState('');

  // Cargar cuentas al iniciar
  useEffect(() => {
    const stored = localStorage.getItem('eventgo_accounts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAccounts([...DEFAULT_GOOGLE_ACCOUNTS, ...parsed]);
      } catch (e) {
        setAccounts(DEFAULT_GOOGLE_ACCOUNTS);
      }
    } else {
      setAccounts(DEFAULT_GOOGLE_ACCOUNTS);
    }
  }, []);

  const handleGoogleLogin = (account: typeof DEFAULT_GOOGLE_ACCOUNTS[0]) => {
    setSelectedAccount(account);
    setStep('role');
  };

  // Login con credenciales creadas
  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError('Por favor ingresá todos los datos.');
      return;
    }

    // Buscar en el pool de cuentas
    const match = accounts.find(acc => acc.email.toLowerCase() === emailInput.toLowerCase());
    if (match) {
      // Login exitoso (simulación sin hash de contraseña para pruebas locales)
      setSelectedAccount(match);
      setStep('role');
      setLoginError('');
    } else {
      setLoginError('Cuenta no encontrada. Registrate primero o usá una cuenta demo.');
    }
  };

  // Crear nueva cuenta
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setRegError('Por favor completá todos los campos.');
      return;
    }

    const exists = accounts.some(acc => acc.email.toLowerCase() === regEmail.toLowerCase());
    if (exists) {
      setRegError('El email ya está registrado.');
      return;
    }

    const newAcc = {
      name: regName,
      email: regEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${regEmail}`, // Avatar dinámico divertido
    };

    // Guardar en localStorage
    const stored = localStorage.getItem('eventgo_accounts');
    let list = [];
    if (stored) {
      try { list = JSON.parse(stored); } catch(e){}
    }
    list.push(newAcc);
    localStorage.setItem('eventgo_accounts', JSON.stringify(list));

    // Actualizar lista en pantalla
    setAccounts([...DEFAULT_GOOGLE_ACCOUNTS, ...list]);

    // Iniciar login de inmediato con la cuenta creada
    setSelectedAccount(newAcc);
    setSelectedRole(regRole);
    setStep('role');
    
    // Limpiar formulario y pasar a pantalla de confirmación
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegError('');
  };

  const handleConfirm = () => {
    if (!selectedAccount || !selectedRole) return;
    onLogin({ 
      ...selectedAccount, 
      role: selectedRole,
      appMode,
      apiUrl
    });
  };

  return (
    <div className="login-screen-bg">
      <div className="login-spot login-spot-purple" />
      <div className="login-spot login-spot-blue" />
      <div className="login-spot login-spot-emerald" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo-row">
          <h1 className="app-logo">Event<span className="app-logo-accent">Go</span></h1>
          <p className="login-tagline">Conectamos eventos con los mejores profesionales</p>
        </div>

        {/* Selector de Modo global (Demo / Real) */}
        <div className="login-mode-selector-wrap">
          <span className="mode-selector-label">Modo de Ejecución:</span>
          <div className="login-mode-tabs">
            <button
              className={`login-mode-tab demo-mode ${appMode === 'demo' ? 'active' : ''}`}
              onClick={() => setAppMode('demo')}
            >
              ⚡ Demo (Mocks)
            </button>
            <button
              className={`login-mode-tab real-mode ${appMode === 'real' ? 'active' : ''}`}
              onClick={() => setAppMode('real')}
            >
              🔌 Real (API)
            </button>
          </div>
        </div>

        {/* URL de la API */}
        {appMode === 'real' && (
          <div className="login-api-url-group">
            <label className="login-api-url-label">URL del Servidor API:</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="login-api-url-input"
              placeholder="http://localhost:3000"
            />
          </div>
        )}

        {/* ── PASO 1: Ingreso / Registro ── */}
        {step === 'login' && (
          <div>
            {/* Pestañas de Login Mode */}
            <div className="auth-nav-tabs">
              <button 
                className={`auth-nav-tab ${authMode === 'google' ? 'active' : ''}`}
                onClick={() => setAuthMode('google')}
              >
                Google Demo
              </button>
              <button 
                className={`auth-nav-tab ${authMode === 'credentials' ? 'active' : ''}`}
                onClick={() => setAuthMode('credentials')}
              >
                Ingresar
              </button>
              <button 
                className={`auth-nav-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Crear Cuenta
              </button>
            </div>

            {/* MODO A: Cuentas Google Demo */}
            {authMode === 'google' && (
              <div className="login-google-step">
                <h2 className="login-step-title">Ingresá al instante</h2>
                <p className="login-step-subtitle">Seleccioná un perfil demo para interactuar:</p>

                <div className="google-accounts-list">
                  {accounts.map((acc) => (
                    <button
                      key={acc.email}
                      className="google-account-row"
                      onClick={() => handleGoogleLogin(acc)}
                    >
                      <img src={acc.avatar} alt={acc.name} className="google-acc-avatar" />
                      <div className="google-acc-info">
                        <span className="google-acc-name">{acc.name}</span>
                        <span className="google-acc-email">{acc.email}</span>
                      </div>
                      <ChevronRight size={16} className="google-acc-arrow" />
                    </button>
                  ))}
                </div>

                <div className="login-divider-row">
                  <span className="login-divider-line" />
                  <span className="login-divider-text">o</span>
                  <span className="login-divider-line" />
                </div>

                <button 
                  className="btn-google-signin"
                  onClick={() => handleGoogleLogin(accounts[0] || DEFAULT_GOOGLE_ACCOUNTS[0])}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>
              </div>
            )}

            {/* MODO B: Ingresar con Credenciales */}
            {authMode === 'credentials' && (
              <form onSubmit={handleCredentialsLogin} className="credentials-form">
                <h2 className="login-step-title">Iniciá sesión</h2>
                <p className="login-step-subtitle">Ingresá tus datos de EventGo</p>

                {loginError && <div className="auth-error-alert">{loginError}</div>}

                <div className="input-group-field">
                  <Mail size={16} className="input-field-icon" />
                  <input
                    type="email"
                    placeholder="Usuario o Correo"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="credentials-input"
                  />
                </div>

                <div className="input-group-field">
                  <Key size={16} className="input-field-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="credentials-input"
                  />
                  <button 
                    type="button" 
                    className="btn-toggle-pwd" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" className="btn-login-primary" style={{ marginTop: '16px' }}>
                  Ingresar
                </button>
              </form>
            )}

            {/* MODO C: Registrar Nueva Cuenta */}
            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="credentials-form">
                <h2 className="login-step-title">Crear Cuenta</h2>
                <p className="login-step-subtitle">Registrate gratis y empezá hoy</p>

                {regError && <div className="auth-error-alert">{regError}</div>}

                <div className="input-group-field">
                  <User size={16} className="input-field-icon" />
                  <input
                    type="text"
                    placeholder="Nombre Completo"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="credentials-input"
                  />
                </div>

                <div className="input-group-field">
                  <Mail size={16} className="input-field-icon" />
                  <input
                    type="email"
                    placeholder="Correo Electrónico"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="credentials-input"
                  />
                </div>

                <div className="input-group-field">
                  <Key size={16} className="input-field-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Escribí una Contraseña"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="credentials-input"
                  />
                  <button 
                    type="button" 
                    className="btn-toggle-pwd" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Rol inicial */}
                <div className="reg-role-toggle-wrap">
                  <span className="mode-selector-label">¿Qué querés hacer?</span>
                  <div className="login-mode-tabs" style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className={`login-mode-tab ${regRole === 'client' ? 'active' : ''}`}
                      onClick={() => setRegRole('client')}
                    >
                      🎉 Organizar eventos
                    </button>
                    <button
                      type="button"
                      className={`login-mode-tab ${regRole === 'provider' ? 'active' : ''}`}
                      onClick={() => setRegRole('provider')}
                    >
                      💼 Ofrecer servicios
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-login-primary" style={{ marginTop: '20px' }}>
                  Crear Cuenta y Continuar
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── PASO 2: Confirmar Rol y Configurar ── */}
        {step === 'role' && selectedAccount && (
          <div className="role-selection-step">
            <div className="welcome-user-row">
              <img src={selectedAccount.avatar} alt={selectedAccount.name} className="welcome-avatar" />
              <div>
                <h2 className="login-step-title">¡Hola, {selectedAccount.name.split(' ')[0]}!</h2>
                <p className="login-step-subtitle">¿Qué querés hacer hoy?</p>
              </div>
            </div>

            <div className="role-cards-grid">
              {/* Cliente */}
              <div
                className={`role-card client-role-card ${selectedRole === 'client' ? 'selected' : ''}`}
                onClick={() => setSelectedRole('client')}
              >
                <div className="role-card-icon-wrap">🎉</div>
                <h3 className="role-card-title">Organizar un evento</h3>
                <p className="role-card-desc">Buscá y contratá los mejores servicios profesionales para tu evento.</p>
                <div className="role-card-badge default-badge">Por defecto</div>
                {selectedRole === 'client' && <div className="role-selected-check">✓</div>}
              </div>

              {/* Proveedor */}
              <div
                className={`role-card provider-role-card ${selectedRole === 'provider' ? 'selected' : ''}`}
                onClick={() => setSelectedRole('provider')}
              >
                <div className="role-card-icon-wrap">💼</div>
                <h3 className="role-card-title">Ofrecer mis servicios</h3>
                <p className="role-card-desc">Aparecé en el mapa, recibí solicitudes y trabajá en eventos cerca tuyo.</p>
                {selectedRole === 'provider' && <div className="role-selected-check">✓</div>}
              </div>
            </div>

            <button
              className="btn-login-primary"
              onClick={handleConfirm}
              disabled={!selectedRole}
            >
              Entrar para {selectedRole === 'client' ? 'organizar eventos' : selectedRole === 'provider' ? 'ofrecer mis servicios' : '...'}
              <ChevronRight size={16} />
            </button>

            <button 
              className="btn-back-link" 
              onClick={() => { 
                setStep('login'); 
                setSelectedRole(null); 
              }}
            >
              ← Cambiar cuenta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
