import Avatar from '@mui/material/Avatar';
import React from 'react';

class AvatarWithMenu extends React.PureComponent<{ src?: string; alt?: string }> {
  public state = {
    open: false,
    anchorEl: undefined,
  };

  public render() {
    const { src, alt } = this.props;

    return (
      <Avatar
        role="presentation"
        src={src}
        alt={alt}
        sx={{
          margin: '0px 10px 0px 5px',
          cursor: 'pointer',
          float: 'left',
        }}
      />
    );
  }
}

export default AvatarWithMenu;
