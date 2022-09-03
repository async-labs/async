import Snackbar from '@mui/material/Snackbar';
import * as React from 'react';

type State = {
  open: boolean;
  message: string;
};

export let openSnackbarExternal;

export default class Notifier extends React.PureComponent<any, State> {
  constructor(props) {
    super(props);

    openSnackbarExternal = this.openSnackbar;

    this.state = {
      open: false,
      message: '',
    };
  }

  public render() {
    return (
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={6000}
        onClose={this.handleSnackbarClose}
        open={this.state.open}
        message={this.state.message}
        // ContentProps={{
        //   'aria-describedby': 'snackbar-message-id',
        // }}
      />
    );
  }

  public handleSnackbarClose = () => {
    this.setState({
      open: false,
      message: '',
    });
  };

  public openSnackbar = ({ message }) => {
    this.setState({ open: true, message });
  };
}
