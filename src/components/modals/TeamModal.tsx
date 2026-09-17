import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Upload, Camera, Trash2, Link } from 'lucide-react';
import type { TeamMember } from '../../types';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TeamMember>) => Promise<void>;
  initialData?: TeamMember | null;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = Boolean(initialData);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [useUrlMode, setUseUrlMode] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDesignation(initialData.designation || '');
        setPhone(initialData.phone || '');
        setEmail(initialData.email || '');
        setAvatar(initialData.avatar || '');
        setNotes(initialData.notes || '');
        setStatus(initialData.status || 'active');
      } else {
        setName('');
        setDesignation('');
        setPhone('');
        setEmail('');
        setAvatar('');
        setNotes('');
        setStatus('active');
      }
      setUseUrlMode(false);
      setError(null);
      setSaving(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds 10MB limit');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Compress and resize image using offscreen canvas to ~25KB
        const img = new Image();
        img.onload = () => {
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setAvatar(compressed);
          } else {
            setAvatar(result);
          }
        };
        img.onerror = () => {
          setAvatar(result);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name is required');
      return;
    }
    if (!designation.trim()) {
      setError('Designation is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        designation: designation.trim(),
        phone: phone.trim(),
        email: email.trim(),
        avatar: avatar.trim() || undefined,
        notes: notes.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div
        id="team-modal-dialog"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                {isEditing ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <p className="text-[11px] text-zinc-500">
                Company staff record for project assignments
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1.5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Direct Avatar Image Uploader */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1.5">Profile Photo / Avatar</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex items-center gap-3.5 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              {avatar ? (
                <div className="relative group shrink-0">
                  <img
                    src={avatar}
                    alt={name || 'Avatar preview'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    title="Remove avatar"
                    className="absolute -top-1 -right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-full bg-zinc-200 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:border-zinc-400 cursor-pointer transition shrink-0"
                >
                  <Camera className="w-5 h-5 text-zinc-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-medium rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-600" />
                    <span>{avatar ? 'Change Image' : 'Upload Image Directly'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseUrlMode(!useUrlMode)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                  >
                    {useUrlMode ? 'Hide URL' : 'Use URL'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">PNG, JPG, WebP up to 5MB</p>
              </div>
            </div>

            {useUrlMode && (
              <div className="mt-2 flex items-center gap-2">
                <Link className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  id="team-avatar-url-input"
                  type="url"
                  value={avatar.startsWith('data:') ? '' : avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
                  className="flex-1 px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Full Name *</label>
            <input
              id="team-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arif Hasan"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Designation / Role Title *
            </label>
            <input
              id="team-role-input"
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Project Architect / Site Engineer"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Phone</label>
              <input
                id="team-phone-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1711-..."
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Email</label>
              <input
                id="team-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@archvibe.com"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Notes & Specialties</label>
            <textarea
              id="team-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Key skills, assigned project focus, vendor coordination..."
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            >
              <option value="active">Active Staff Member</option>
              <option value="inactive">Inactive / On Leave</option>
            </select>
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-team-member-btn"
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Team Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
