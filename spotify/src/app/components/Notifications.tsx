import { Toaster } from 'react-hot-toast';

export default function Notifications() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options for all toasts
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          maxWidth: '500px',
        },
        // Custom success style
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#1DB954',
            secondary: '#FFFFFF',
          },
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #1DB954',
          },
        },
        // Custom error style
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#EF4444',
            secondary: '#FFFFFF',
          },
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #EF4444',
          },
        },
      }}
    />
  );
} 