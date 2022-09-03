// rename

import { openConfirmDialog } from '../components/common/Confirmer';

export default function confirm({
  title,
  message,
  okText,
  buttonColor,
  onAnswer,
}: {
  title: string;
  message: string;
  okText?: string;
  buttonColor?: 'inherit' | 'default' | 'primary' | 'secondary';
  onAnswer: (answer: boolean) => void;
}) {
  openConfirmDialog({ title, message, okText, buttonColor, onAnswer });
}
