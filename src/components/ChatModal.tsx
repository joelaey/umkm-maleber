'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile, UserRole } from '@/types';
import { Send, X, MessageSquare, Phone, CheckCheck, Clock, Store, Bike, User, ShieldCheck } from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  targetUser: { id: string; name: string; role: UserRole; phone?: string; avatar?: string };
  contextTitle?: string; // e.g. "Order #1001 - Warung Liwet Ibu Imas" or "Ojek Online Maleber"
  orderId?: string;
  rideId?: string;
  messages: ChatMessage[];
  onSendMessage: (msg: {
    orderId?: string;
    rideId?: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    receiverId: string;
    receiverName: string;
    message: string;
  }) => void;
}

const PRESET_MESSAGES: Record<UserRole, string[]> = {
  buyer: [
    'Halo, apakah pesanan saya sedang diproses?',
    'Saya sudah sesuai patokan lokasi jemput.',
    'Mohon sambal dadaknya dipisah ya kak.',
    'Terima kasih banyak!'
  ],
  seller: [
    'Pesanan Anda sedang dimasak & disiapkan!',
    'Stok produk baru saja diperbarui.',
    'Pesanan siap diambil driver kurir.',
    'Terima kasih telah berbelanja di UMKM Maleber!'
  ],
  driver: [
    'Halo! Saya driver ojek Maleber sedang menuju lokasi Anda.',
    'Saya sudah tiba di lokasi penjemputan.',
    'Paket makanan sudah saya ambil dari toko.',
    'Mohon bersiap di depan lokasi ya kak.'
  ],
  admin: [
    'Halo warga Maleber, ada yang bisa kami bantu?',
    'Laporan Anda telah diterima petugas desa.'
  ]
};

export default function ChatModal({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  contextTitle,
  orderId,
  rideId,
  messages,
  onSendMessage
}: ChatModalProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = currentUser?.id || 'usr-anon';
  const currentUserRole = currentUser?.role || 'buyer';
  const currentUserName = currentUser?.name || 'Warga Maleber';

  // Filter messages strictly for THIS 1-on-1 private room thread (No Group Chat mixing)
  const filteredMessages = messages.filter((m) => {
    // 1-on-1 Pairwise Room Check: Must be between current user and target user only!
    const isDirectUserPair =
      (m.senderId === currentUserId && m.receiverId === targetUser.id) ||
      (m.senderId === targetUser.id && m.receiverId === currentUserId) ||
      (m.senderName === currentUserName && m.receiverName === targetUser.name) ||
      (m.senderName === targetUser.name && m.receiverName === currentUserName) ||
      (m.senderRole === currentUserRole && (m.receiverId === targetUser.id || m.receiverName === targetUser.name)) ||
      ((m.senderId === targetUser.id || m.senderName === targetUser.name) && (m.receiverId === currentUserId || m.receiverName === currentUserName));

    if (!isDirectUserPair) return false;

    if (orderId) {
      return m.orderId === orderId;
    }
    if (rideId) {
      return m.rideId === rideId;
    }
    return !m.orderId && !m.rideId;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    onSendMessage({
      orderId,
      rideId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      receiverId: targetUser.id,
      receiverName: targetUser.name,
      message: text.trim()
    });

    if (!textToSend) setInputText('');
  };

  const roleLabel =
    targetUser.role === 'seller'
      ? 'Penjual UMKM'
      : targetUser.role === 'driver'
      ? 'Mitra Driver Ojek'
      : targetUser.role === 'admin'
      ? 'Petugas Desa'
      : 'Pemesan / Warga';

  const RoleIcon =
    targetUser.role === 'seller'
      ? Store
      : targetUser.role === 'driver'
      ? Bike
      : targetUser.role === 'admin'
      ? ShieldCheck
      : User;

  const cleanPhone = targetUser.phone ? targetUser.phone.replace(/[^0-9]/g, '') : '';
  const waUrl = cleanPhone ? `https://wa.me/62${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}` : null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-lg w-full h-[88vh] sm:h-[580px] max-h-[620px] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={targetUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={targetUser.name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900"></span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white line-clamp-1">{targetUser.name}</h4>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <RoleIcon className="w-3 h-3" /> {roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {contextTitle || 'Pesan Langsung Aplikasi Maleber'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-200 transition-colors cursor-pointer"
                title="Hubungi via WhatsApp Direct"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-100/60 dark:bg-zinc-950/60">
          
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto animate-bounce" />
              <p className="font-bold text-xs text-zinc-600 dark:text-zinc-400">Belum ada percakapan</p>
              <p className="text-[11px] text-zinc-400">Mulai chat dengan {targetUser.name} untuk konfirmasi pesanan/rute.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-fade-in`}
                >
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] font-bold text-zinc-400">{isMe ? 'Anda' : msg.senderName}</span>
                    <span className="text-[9px] text-zinc-400">
                      {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Preset Message Pills */}
        <div className="p-2 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800/80 overflow-x-auto flex gap-1.5 scrollbar-none">
          {PRESET_MESSAGES[currentUserRole]?.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(preset)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-zinc-600 dark:text-zinc-300 hover:text-emerald-700 transition-all cursor-pointer whitespace-nowrap border border-zinc-200/60 dark:border-zinc-700/60"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={`Tulis pesan untuk ${targetUser.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
