import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { inject } from 'mobx-react';
import Link from 'next/link';
import NProgress from 'nprogress';
import React from 'react';

import notify from '../../lib/notify';
import { Message, Store } from '../../lib/store';

// move reference to this component to `ChatDetail` from `ChatList`

type Props = {
  title: string;
  store?: Store;
  onClose: () => void;
  open: boolean;
  query: string;
  search: ({
    query,
    teamId,
    chatId,
  }: {
    query: string;
    teamId: string;
    chatId: string;
  }) => Promise<Array<Message>>;
  teamId: string;
  chatId: string;
};

type State = {
  query: string;
  isSearching: boolean;
  isSearchDone: boolean;
  resultList: Array<Message>;
};

class SearchWithinChat extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      query: props.query || '',
      isSearching: false,
      isSearchDone: false,
      resultList: [],
    };
  }

  public componentDidMount() {
    if (this.props.query) {
      this.search();
    }
  }

  public render() {
    const { open, title, store } = this.props;

    return (
      <Dialog
        onClose={this.handleClose}
        aria-labelledby="simple-dialog-title"
        open={open}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id="simple-dialog-title" style={{ marginBottom: '0px' }}>
          {title}
        </DialogTitle>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              this.search();
            }}
          >
            <TextField
              disabled
              style={{ width: '100%' }}
              placeholder="Type query"
              autoComplete="off"
              value={this.state.query}
              onChange={(event) => {
                this.setState({ query: event.target.value });
              }}
            />
            <p />
            {this.state.isSearching ? <p>Searching...</p> : null}
            <p />
            <br />
            {this.renderResult()}
            <p />
            <br />
            <DialogActions>
              <Button
                variant="outlined"
                onClick={this.handleClose}
                style={{
                  color: store.currentUser.showDarkTheme ? '#fff' : '#000',
                  border: store.currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
                }}
              >
                Close
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  private renderResult() {
    const { teamId } = this.props;
    const { resultList, isSearchDone } = this.state;

    if (isSearchDone && resultList.length === 0) {
      return <p>No messages found. Try different query (must be at least 3 characters).</p>;
    }

    return (
      <div>
        {resultList.map((m) => (
          <div
            key={m.chatId + m.messageId}
            style={{
              marginTop: '10px',
              padding: '10px 10px 0 10px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              overflow: 'auto',
            }}
          >
            Found in messages:{' '}
            {m.parentMessageId ? (
              <Link
                href={`/chat?chatId=${m.chatId}&teamId=${teamId}&parentMessageId=${m.parentMessageId}#message-${m.parentMessageId}`}
                as={`/teams/${teamId}/chats/${m.chatId}?parentMessageId=${m.parentMessageId}#message-${m.parentMessageId}`}
              >
                <a
                  onClick={() => {
                    this.handleClose();
                  }}
                  dangerouslySetInnerHTML={{
                    __html: this.getHighlightedSearchResults(m),
                  }}
                />
              </Link>
            ) : (
              <Link
                href={`/chat?chatId=${m.chatId}&teamId=${teamId}#message-${m.messageId}`}
                as={`/teams/${teamId}/chats/${m.chatId}#message-${m.messageId}`}
              >
                <a
                  onClick={() => {
                    this.handleClose();
                  }}
                  dangerouslySetInnerHTML={{
                    __html: this.getHighlightedSearchResults(m),
                  }}
                />
              </Link>
            )}
            <p />
          </div>
        ))}
      </div>
    );
  }

  private handleClose = () => {
    this.setState({ query: '' });
    this.props.onClose();
  };

  private getHighlightedSearchResults(message: Message) {
    return message.getHighlightedSearchResultsStoreMethod(this.state.query);
  }

  private search = async () => {
    const { teamId, chatId } = this.props;
    const { query } = this.state;

    if (!query) {
      this.setState({ resultList: [] });
      return;
    }

    this.setState({ isSearching: true, isSearchDone: false });

    NProgress.start();
    try {
      this.setState({
        resultList: await this.props.search({ query, teamId, chatId }),
        isSearchDone: true,
      });
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.setState({ isSearching: false });
      NProgress.done();
    }
  };
}

export default inject('store')(SearchWithinChat);
