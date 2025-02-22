import Toast from 'react-native-toast-message';
import { ToastVerticalPosition, ToastHorizontalPosition } from '@/components/CustomToast';

interface ToastPosition {
  vertical: ToastVerticalPosition;
  horizontal: ToastHorizontalPosition;
}

interface ToastOptions {
  position?: ToastPosition;
  description?: string;
}

// Toast utility functions
export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: options?.description,
      visibilityTime: 2000,
      autoHide: true,
      onShow: () => {
        // Toast is now visible
      },
      onHide: () => {
        // Toast is now hidden
      },
      props: {
        isVisible: true,
        position: options?.position || { vertical: 'center', horizontal: 'center' }
      }
    });
  },
  error: (message: string, options?: ToastOptions) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: options?.description,
      visibilityTime: 2000,
      autoHide: true,
      onShow: () => {
        // Toast is now visible
      },
      onHide: () => {
        // Toast is now hidden
      },
      props: {
        style: {
          borderLeftColor: '#ff4444',
        },
        isVisible: true,
        position: options?.position || { vertical: 'center', horizontal: 'center' }
      }
    });
  },
};
