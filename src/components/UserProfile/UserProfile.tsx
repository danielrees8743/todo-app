import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { supabase } from '../../lib/supabase';
import {
  User,
  Lock,
  Save,
  ArrowLeft,
  Loader2,
  Camera,
  X,
  Check,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../Header/Header';
import getCroppedImg from '../../utils/cropImage';

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface ProfileFormData {
  full_name: string;
  username: string;
  website: string;
  avatar_url: string;
}

interface PasswordData {
  password: string;
  confirmPassword: string;
}

export default function UserProfile() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);

  // Crop State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Form State
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    username: '',
    website: '',
    avatar_url: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    password: '',
    confirmPassword: '',
  });

  // Get Current User
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch Profile Data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { full_name: '', username: '', website: '' };
    },
  });

  // Fetch Todo Stats
  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count: total } = await supabase
        .from('todos')
        .select('id', { count: 'exact', head: true });

      const { count: completed } = await supabase
        .from('todos')
        .select('id', { count: 'exact', head: true })
        .eq('completed', true);

      return { total: total || 0, completed: completed || 0 };
    },
  });

  const initialized = useRef(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile && !initialized.current) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        website: profile.website || '',
        avatar_url: profile.avatar_url || '',
      });
      initialized.current = true;
    }
  }, [profile]);

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
    }
    // clear input
    e.target.value = '';
  };

  const cancelCrop = () => {
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const handleSaveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    try {
      setUploading(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (!croppedImageBlob) {
        throw new Error('Failed to crop image');
      }

      // Delete old avatar if it exists and is hosted in our bucket
      if (formData.avatar_url && formData.avatar_url.includes('/avatars/')) {
        const oldPath = formData.avatar_url.split('/avatars/').pop();
        if (oldPath) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([oldPath]);

          if (deleteError) {
            console.error('Error deleting old avatar:', deleteError);
          }
        }
      }

      const fileName = `${user.id}/${Math.random()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));

      // Immediately update profile with new avatar
      updateProfileMutation.mutate({ ...formData, avatar_url: publicUrl });

      setMessage({ type: 'success', text: 'Avatar uploaded and updated!' });
      setImageSrc(null);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: ProfileFormData) => {
      if (!user) throw new Error('User not found');
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        ...updatedData,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error) => {
      setMessage({
        type: 'error',
        text: `Error updating profile: ${error.message}`,
      });
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ password: '', confirmPassword: '' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error) => {
      setMessage({
        type: 'error',
        text: `Error changing password: ${error.message}`,
      });
    },
  });

  const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwordData.password.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters',
      });
      return;
    }
    changePasswordMutation.mutate(passwordData.password);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (profileLoading) {
    return (
      <div className='flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col'>
      <Header />
      <div className='flex-1 max-w-4xl mx-auto w-full p-6'>
        {/* Header */}
        <div className='mb-8 flex items-center gap-4'>
          <Link
            to='/'
            className='p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <ArrowLeft className='w-6 h-6 text-gray-700 dark:text-gray-300' />
          </Link>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Account Settings
          </h1>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700'>
            <h3 className='text-sm font-medium text-gray-600 dark:text-gray-300'>
              Total Tasks
            </h3>
            <p className='text-3xl font-bold text-gray-900 dark:text-white mt-2'>
              {stats?.total || 0}
            </p>
          </div>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700'>
            <h3 className='text-sm font-medium text-gray-600 dark:text-gray-300'>
              Completed
            </h3>
            <p className='text-3xl font-bold text-green-600 dark:text-green-400 mt-2'>
              {stats?.completed || 0}
            </p>
          </div>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700'>
            <h3 className='text-sm font-medium text-gray-600 dark:text-gray-300'>
              Completion Rate
            </h3>
            <p className='text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2'>
              {stats?.total && stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0}
              %
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {/* Profile Form */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
            <div className='p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                <User size={20} />
                Profile Information
              </h2>
            </div>

            <form onSubmit={handleProfileSubmit} className='p-6 space-y-4'>
              <div className='flex flex-col items-center mb-6'>
                <div className='relative w-24 h-24 mb-4'>
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt='Avatar'
                      className='w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md'
                    />
                  ) : (
                    <div className='w-full h-full rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md'>
                      {formData.full_name ? (
                        formData.full_name.charAt(0).toUpperCase()
                      ) : (
                        <User size={40} />
                      )}
                    </div>
                  )}
                  <label
                    htmlFor='avatar-upload'
                    className='absolute bottom-0 right-0 bg-white dark:bg-gray-800 p-2 rounded-full cursor-pointer shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                  >
                    <input
                      type='file'
                      id='avatar-upload'
                      accept='image/*'
                      className='hidden'
                      onChange={onFileChange}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <Loader2
                        size={16}
                        className='animate-spin text-blue-600'
                      />
                    ) : (
                      <Camera
                        size={16}
                        className='text-gray-700 dark:text-gray-300'
                      />
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Full Name
                </label>
                <input
                  type='text'
                  name='full_name'
                  value={formData.full_name}
                  onChange={handleChange}
                  className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                  placeholder='John Doe'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Username
                </label>
                <input
                  type='text'
                  name='username'
                  value={formData.username}
                  onChange={handleChange}
                  className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                  placeholder='johndoe'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Website
                </label>
                <input
                  type='url'
                  name='website'
                  value={formData.website}
                  onChange={handleChange}
                  className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                  placeholder='https://example.com'
                />
              </div>

              <div className='pt-4'>
                <button
                  type='submit'
                  disabled={updateProfileMutation.isPending}
                  className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
                >
                  <Save size={18} />
                  {updateProfileMutation.isPending
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Form */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit'>
            <div className='p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                <Lock size={20} />
                Security
              </h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  New Password
                </label>
                <input
                  type='password'
                  value={passwordData.password}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      password: e.target.value,
                    })
                  }
                  className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                  placeholder='••••••••'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Confirm Password
                </label>
                <input
                  type='password'
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                  placeholder='••••••••'
                />
              </div>

              <div className='pt-4'>
                <button
                  type='submit'
                  disabled={changePasswordMutation.isPending}
                  className='flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50'
                >
                  <Lock size={18} />
                  {changePasswordMutation.isPending
                    ? 'Updating...'
                    : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {imageSrc && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'>
          <div className='relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]'>
            <div className='p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Adjust Image
              </h3>
              <button
                onClick={cancelCrop}
                className='text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 transition-colors'
              >
                <X size={20} />
              </button>
            </div>

            <div className='relative h-64 sm:h-80 bg-black w-full'>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                classes={{
                  containerClassName: 'bg-black',
                  mediaClassName: 'object-contain',
                }}
              />
            </div>

            <div className='p-4 space-y-6 bg-white dark:bg-gray-800 z-10'>
              <div className='flex items-center gap-3 text-gray-700 dark:text-gray-300'>
                <ZoomOut size={16} />
                <input
                  type='range'
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label='Zoom'
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className='w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600'
                />
                <ZoomIn size={16} />
              </div>

              <div className='flex gap-3'>
                <button
                  onClick={cancelCrop}
                  className='flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCroppedImage}
                  disabled={uploading}
                  className='flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors font-medium shadow-sm'
                >
                  {uploading ? (
                    <Loader2 className='animate-spin' size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                  Save & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
