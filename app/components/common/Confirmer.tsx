import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import React from 'react';

type State = {
  open: boolean;
  title: string;
  message: string;
  okText?: string;
  buttonColor?: 'inherit' | 'error' | 'primary' | 'secondary' | 'info' | 'success' | 'warning';
  onAnswer: (answer) => void;
};

let openConfirmDialogFn;

class Confirmer extends React.Component<{ showDarkTheme: boolean }, State> {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      title: 'Are you sure?',
      message: '',
      okText: '',
      buttonColor: 'primary',
      onAnswer: null,
    };
  }

  public componentDidMount() {
    openConfirmDialogFn = this.openConfirmDialog;
  }

  public render() {
    const { title, message, okText, buttonColor } = this.state;

    return (
      <Dialog
        open={this.state.open}
        onClose={this.handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <DialogTitle style={{ padding: '0px 0px 20px 0px' }} id="alert-dialog-title">
            {title}
          </DialogTitle>
          <DialogContentText id="alert-dialog-description" style={{ textAlign: 'left' }}>
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ padding: '10px', margin: 'auto' }}>
          <Button
            onClick={this.handleClose}
            variant="outlined"
            style={{
              color: this.props.showDarkTheme ? '#fff' : '#000',
              border: this.props.showDarkTheme ? '1px solid #fff' : '1px solid #000',
            }}
          >
            Cancel
          </Button>
          <Button onClick={this.handleYes} variant="contained" color={buttonColor || 'primary'}>
            {okText || 'OK'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private handleClose = () => {
    this.setState({ open: false });
    this.state.onAnswer(false);
  };

  private handleYes = () => {
    this.setState({ open: false });
    this.state.onAnswer(true);
  };

  private openConfirmDialog = ({ title, message, okText, buttonColor, onAnswer }) => {
    this.setState({ open: true, title, message, okText, buttonColor, onAnswer });
  };
}

export function openConfirmDialog({
  title,
  message,
  okText,
  buttonColor,
  onAnswer,
}: {
  title: string;
  message: string;
  okText: string;
  buttonColor: 'inherit' | 'error' | 'primary' | 'secondary' | 'info' | 'success' | 'warning';
  onAnswer: (answer) => void;
}) {
  openConfirmDialogFn({ title, message, okText, buttonColor, onAnswer });
}

export default Confirmer;
