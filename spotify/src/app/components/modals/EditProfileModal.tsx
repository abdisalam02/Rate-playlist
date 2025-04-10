'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onSave should handle API call and return true/false for success
  onSave: (newName: string) => Promise<boolean>; 
  currentName: string | undefined | null;
}

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  currentName,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when the modal opens or the current name changes
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentName || '');
      setError(null); // Reset error on open
    }
  }, [isOpen, currentName]);

  const handleSaveClick = async () => {
    const trimmedName = displayName.trim();
    // Basic validation
    if (!trimmedName) {
      setError('Display name cannot be empty.');
      return;
    }
     if (trimmedName.length > 50) {
        setError('Display name cannot exceed 50 characters.');
        return;
    }
    // If name hasn't changed, just close
    if (trimmedName === (currentName || '')) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Call the provided onSave function (which contains the API logic)
    const success = await onSave(trimmedName); 
    
    setIsLoading(false);

    if (success) {
      // Success toast is handled by onSave usually, but can add one here if needed
      // toast.success('Profile updated!'); 
      onClose(); // Close modal on success
    } else {
      // The onSave function should ideally show specific error toasts.
      // Set a generic error if it fails.
      setError('Failed to update profile. Please check the console or try again.');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      {/* Dialog setup */}
      <Dialog as="div" className="relative z-50" onClose={() => !isLoading && onClose()}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold leading-6 text-gray-100 flex items-center mb-4"
                >
                  <UserCircleIcon className="h-6 w-6 mr-2 text-[#1DB954]" />
                  Edit Profile
                </Dialog.Title>
                
                {/* Form Content */}
                <div className="mt-2 space-y-4">
                   <div>
                     <label htmlFor="displayName" className="block text-sm font-medium text-gray-400 mb-1">
                       Display Name
                     </label>
                     <input
                       type="text"
                       id="displayName"
                       name="displayName"
                       value={displayName}
                       onChange={(e) => setDisplayName(e.target.value)}
                       className="w-full bg-[#282828] border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#1DB954] focus:border-[#1DB954] disabled:opacity-50"
                       placeholder="Enter your display name"
                       maxLength={50}
                       disabled={isLoading} // Disable input while loading
                     />
                     {/* Display validation error */}
                     {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
                   </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e] transition-colors disabled:opacity-50"
                    onClick={onClose}
                    disabled={isLoading} // Disable cancel while loading
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center items-center rounded-md border border-transparent bg-[#1DB954] px-4 py-2 text-sm font-medium text-black hover:bg-[#1ed760] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSaveClick}
                    disabled={isLoading} // Disable save while loading
                  >
                    {/* Show spinner when loading */}
                    {isLoading ? (
                       <>
                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         Saving...
                       </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
