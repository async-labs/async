import React from 'react';

class MessageContent extends React.Component<{
  html: string;
  isPreview?: boolean;
  isThemeDark: boolean;
}> {
  public render() {
    const { html, isPreview, isThemeDark } = this.props;

    const style: any = {
      overflowWrap: 'break-word',
      marginTop: '0px',
      padding: '0px',
      lineHeight: '1.5em',
      fontFamily: 'Roboto, sans-serif',
      background: isThemeDark ? 'none' : 'none',
    };

    if (isPreview) {
      style.marginTop = '0px';
      style.minHeight = '349px';
    }

    return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
}

export default MessageContent;
