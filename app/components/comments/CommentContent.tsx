import React from 'react';

class CommentContent extends React.Component<{ html: string; isPreview?: boolean }> {
  public render() {
    const { html, isPreview } = this.props;

    const style: any = {
      overflowWrap: 'break-word',
      marginTop: '0px',
      padding: '7px 10px',
      lineHeight: '1.5em',
      fontSize: '15px',
      fontFamily: 'Roboto, sans-serif',
    };

    if (isPreview) {
      style.marginTop = '0px';
      style.minHeight = '349px';
    }

    return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
}

export default CommentContent;
