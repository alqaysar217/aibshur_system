'use client';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the event type, as TypeScript may not know it.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

export default function InstallPwaButton({ isCollapsed }: { isCollapsed: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent the default browser prompt
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    });
  };
  
  if (!installPrompt) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstallClick}
      className={cn("w-full mt-2 font-black text-base justify-start", isCollapsed && 'justify-center')}
    >
      <Download className={cn("w-5 h-5", !isCollapsed && 'ml-2')} />
      {!isCollapsed && 'تثبيت التطبيق'}
    </Button>
  );
}
