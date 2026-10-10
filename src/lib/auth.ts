import { User, UserRole } from "@/types/auth";
import { generateUUID } from "./engine";

interface StoredUser extends User {
  passwordHash: string; // Simple hash / string for demo
}

const usersStore = new Map<string, StoredUser>();

// Pre-seed Admin and standard user
const SEED_ADMIN: StoredUser = {
  id: "usr-admin-01",
  email: "admin@apizz.net",
  name: "Quản Trị Viên (Admin)",
  role: "admin",
  credits: 9999,
  createdAt: new Date().toISOString(),
  passwordHash: "admin123",
  avatar: "🛡️",
};

const SEED_USER: StoredUser = {
  id: "usr-user-01",
  email: "user@apizz.net",
  name: "Thành Viên Demo",
  role: "user",
  credits: 50,
  createdAt: new Date().toISOString(),
  passwordHash: "user123",
  avatar: "👤",
};

usersStore.set(SEED_ADMIN.email.toLowerCase(), SEED_ADMIN);
usersStore.set("admin@cctest.ai", SEED_ADMIN);
usersStore.set(SEED_USER.email.toLowerCase(), SEED_USER);
usersStore.set("user@cctest.ai", SEED_USER);

export function registerUser(email: string, password: string, name: string): { user?: User; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { error: "Vui lòng nhập đầy đủ Email và Mật khẩu." };
  }

  if (usersStore.has(normalizedEmail)) {
    return { error: "Email này đã được đăng ký tài khoản." };
  }

  const newUser: StoredUser = {
    id: generateUUID(),
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split("@")[0],
    role: "user",
    credits: 10, // 10 free credits for new user
    createdAt: new Date().toISOString(),
    passwordHash: password,
    avatar: "👤",
  };

  usersStore.set(normalizedEmail, newUser);
  const { passwordHash, ...safeUser } = newUser;
  return { user: safeUser };
}

export function authenticateUser(email: string, password: string): { user?: User; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = usersStore.get(normalizedEmail);

  if (!user || user.passwordHash !== password) {
    return { error: "Email hoặc mật khẩu không chính xác." };
  }

  const { passwordHash, ...safeUser } = user;
  return { user: safeUser };
}

export function getAllUsers(): User[] {
  return Array.from(usersStore.values()).map(({ passwordHash, ...u }) => u);
}

export function deleteUser(userId: string): boolean {
  for (const [email, user] of Array.from(usersStore.entries())) {
    if (user.id === userId && user.role !== "admin") {
      usersStore.delete(email);
      return true;
    }
  }
  return false;
}

export function updateUserRole(userId: string, newRole: UserRole): boolean {
  for (const [email, user] of Array.from(usersStore.entries())) {
    if (user.id === userId) {
      user.role = newRole;
      usersStore.set(email, user);
      return true;
    }
  }
  return false;
}

export function adjustUserCredits(userId: string, creditsDelta: number): boolean {
  for (const [email, user] of Array.from(usersStore.entries())) {
    if (user.id === userId) {
      user.credits = Math.max(0, user.credits + creditsDelta);
      usersStore.set(email, user);
      return true;
    }
  }
  return false;
}
