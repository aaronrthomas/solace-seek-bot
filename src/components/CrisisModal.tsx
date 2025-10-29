import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface CrisisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CrisisModal = ({ open, onOpenChange }: CrisisModalProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle>We're Here for You</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p className="font-medium text-foreground">
              If you're experiencing thoughts of self-harm or suicide, please reach out for immediate help:
            </p>
            
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-card border">
                <p className="font-semibold mb-1">National Suicide Prevention Lifeline</p>
                <a href="tel:988" className="text-primary hover:underline text-lg font-bold">
                  988
                </a>
                <p className="text-muted-foreground mt-1">Available 24/7</p>
              </div>

              <div className="p-3 rounded-lg bg-card border">
                <p className="font-semibold mb-1">Crisis Text Line</p>
                <p className="text-muted-foreground">Text HOME to <span className="font-bold">741741</span></p>
              </div>

              <div className="p-3 rounded-lg bg-card border">
                <p className="font-semibold mb-1">Emergency Services</p>
                <a href="tel:911" className="text-primary hover:underline text-lg font-bold">
                  911
                </a>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              You're not alone. These services are free, confidential, and available 24/7.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>I Understand</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CrisisModal;