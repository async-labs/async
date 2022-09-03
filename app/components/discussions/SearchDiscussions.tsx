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
import { Discussion, Store } from '../../lib/store';

type Props = {
  title: string;
  store?: Store;
  onClose: () => void;
  open: boolean;
  query: string;
  whichList: string;
  search: ({
    query,
    whichList,
    teamId,
  }: {
    query: string;
    whichList: string;
    teamId: string;
  }) => Promise<Array<Discussion>>;
  teamId: string;
};

type State = {
  query: string;
  whichList: string;
  isSearching: boolean;
  isSearchDone: boolean;
  resultList: Array<Discussion>;
};

class SearchDiscussions extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      query: props.query || '',
      whichList: props.whichList || '',
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
              fullWidth
              placeholder="Search query"
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
    const { teamId, store } = this.props;
    const { resultList, isSearchDone } = this.state;

    if (isSearchDone && resultList.length === 0) {
      return <p>No matches found.</p>;
    }

    return (
      <div>
        {resultList.map((obj) => (
          <div
            key={obj.discussionId + '-search-result'}
            style={{
              marginTop: '10px',
              padding: '10px 10px 0 10px',
              border: store.currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
              overflow: 'auto',
            }}
          >
            Discussion:{' '}
            <Link
              href={`/discussion?discussionId=${obj.discussionId}&teamId=${teamId}`}
              as={`/teams/${teamId}/discussions/${obj.discussionId}`}
            >
              <a
                onClick={() => {
                  this.handleClose();
                }}
                dangerouslySetInnerHTML={{
                  __html: this.getHighlightedDiscussionName(obj) || obj.discussionName,
                }}
              />
            </Link>
            <p />
            <p>Comment(s):</p>
            <div dangerouslySetInnerHTML={{ __html: this.getExcerptForComment(obj) }} />
          </div>
        ))}
      </div>
    );
  }

  private handleClose = () => {
    this.setState({ query: '' });
    this.props.onClose();
  };

  private getExcerptForComment(obj: Discussion) {
    return obj.getSearchExcerptForCommentStoreMethod(this.state.query);
  }

  private getHighlightedDiscussionName(obj: Discussion) {
    return obj.getHighlightedDiscussionNameStoreMethod(this.state.query);
  }

  private search = async () => {
    const { teamId } = this.props;
    const { query, whichList } = this.state;

    if (!query) {
      this.setState({ resultList: [] });
      return;
    }

    this.setState({ isSearching: true, isSearchDone: false });

    NProgress.start();
    try {
      this.setState({
        resultList: await this.props.search({ query, whichList, teamId }),
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

export default inject('store')(SearchDiscussions);
