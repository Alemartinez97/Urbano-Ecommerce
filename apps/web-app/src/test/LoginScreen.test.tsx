/**
 * LOGIN SCREEN — Lógica de estado tests (sin render)
 * Valida el flujo de login: selección de cuenta, roles, y callback.
 * Testeamos la lógica de negocio sin depender de render de React 19.
 */
import { describe, it, expect, vi } from 'vitest';
import type { SessionUser } from '../components/LoginScreen';

// ── Cuentas demo (mismas que LoginScreen) ────────────────────────────────
const GOOGLE_ACCOUNTS = [
  { name: 'Deyvid Oficial', email: 'deyvid@gmail.com',  avatar: 'https://img1', role: undefined },
  { name: 'Lucas Díaz',     email: 'lucas@gmail.com',   avatar: 'https://img2', role: undefined },
  { name: 'Ana Bertolini',  email: 'ana@gmail.com',     avatar: 'https://img3', role: undefined },
];

// ── Simulación de la lógica de sesión de LoginScreen ────────────────────
type Step = 'login' | 'role';

interface LoginState {
  step: Step;
  selectedAccount: typeof GOOGLE_ACCOUNTS[0] | null;
  selectedRole: 'client' | 'provider' | null;
}

function createLoginMachine() {
  let state: LoginState = { step: 'login', selectedAccount: null, selectedRole: null };

  return {
    getState: () => ({ ...state }),

    selectAccount: (account: typeof GOOGLE_ACCOUNTS[0]) => {
      state = { ...state, step: 'role', selectedAccount: account };
    },

    selectRole: (role: 'client' | 'provider') => {
      state = { ...state, selectedRole: role };
    },

    canConfirm: () => state.selectedRole !== null,

    confirm: (onLogin: (user: SessionUser) => void) => {
      if (!state.selectedAccount || !state.selectedRole) return;
      onLogin({ 
        ...state.selectedAccount, 
        role: state.selectedRole,
        appMode: 'demo',
        apiUrl: 'http://localhost:3000'
      });
    },

    goBack: () => {
      state = { step: 'login', selectedAccount: null, selectedRole: null };
    },
  };
}

describe('LoginScreen — Lógica del flujo de autenticación', () => {
  describe('Estado inicial', () => {
    it('inicia en el paso "login"', () => {
      const machine = createLoginMachine();
      expect(machine.getState().step).toBe('login');
    });

    it('no tiene cuenta seleccionada al inicio', () => {
      const machine = createLoginMachine();
      expect(machine.getState().selectedAccount).toBeNull();
    });

    it('no puede confirmar sin rol seleccionado', () => {
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]);
      expect(machine.canConfirm()).toBe(false);
    });
  });

  describe('Selección de cuenta Google', () => {
    it('avanza al paso "role" al seleccionar una cuenta', () => {
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]);
      expect(machine.getState().step).toBe('role');
    });

    it('guarda la cuenta seleccionada', () => {
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[1]); // Lucas
      expect(machine.getState().selectedAccount?.name).toBe('Lucas Díaz');
    });

    it('las 3 cuentas demo tienen email y avatar', () => {
      for (const acc of GOOGLE_ACCOUNTS) {
        expect(acc.email).toContain('@gmail.com');
        expect(acc.avatar).toBeTruthy();
        expect(acc.name).toBeTruthy();
      }
    });
  });

  describe('Selección de rol', () => {
    it('puede confirmar después de elegir "Organizar un evento" (client)', () => {
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]);
      machine.selectRole('client');
      expect(machine.canConfirm()).toBe(true);
    });

    it('puede confirmar después de elegir "Ofrecer mis servicios" (provider)', () => {
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]);
      machine.selectRole('provider');
      expect(machine.canConfirm()).toBe(true);
    });
  });

  describe('Confirmación → onLogin callback', () => {
    it('llama onLogin con role=client al elegir organizar eventos', () => {
      const onLogin = vi.fn();
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]); // Deyvid
      machine.selectRole('client');
      machine.confirm(onLogin);

      expect(onLogin).toHaveBeenCalledOnce();
      const session: SessionUser = onLogin.mock.calls[0][0];
      expect(session.role).toBe('client');
      expect(session.name).toBe('Deyvid Oficial');
      expect(session.email).toBe('deyvid@gmail.com');
    });

    it('llama onLogin con role=provider al elegir ofrecer servicios', () => {
      const onLogin = vi.fn();
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[1]); // Lucas
      machine.selectRole('provider');
      machine.confirm(onLogin);

      expect(onLogin).toHaveBeenCalledOnce();
      const session: SessionUser = onLogin.mock.calls[0][0];
      expect(session.role).toBe('provider');
      expect(session.name).toBe('Lucas Díaz');
    });

    it('NO llama onLogin si no hay rol seleccionado', () => {
      const onLogin = vi.fn();
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]);
      machine.confirm(onLogin); // sin rol → no llama

      expect(onLogin).not.toHaveBeenCalled();
    });

    it('NO llama onLogin si no hay cuenta seleccionada', () => {
      const onLogin = vi.fn();
      const machine = createLoginMachine();
      machine.confirm(onLogin);

      expect(onLogin).not.toHaveBeenCalled();
    });
  });

  describe('Botón "← Cambiar cuenta" vuelve al paso de login', () => {
    it('resetea el estado al volver atrás', () => {
      const machine = createLoginMachine();
      machine.selectAccount(GOOGLE_ACCOUNTS[0]);
      machine.selectRole('provider');
      machine.goBack();

      expect(machine.getState().step).toBe('login');
      expect(machine.getState().selectedAccount).toBeNull();
      expect(machine.getState().selectedRole).toBeNull();
    });
  });
});
