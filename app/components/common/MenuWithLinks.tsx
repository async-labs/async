import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Link from 'next/link';
import React from 'react';

type Props = {
  src?: string;
  alt?: string;
  options: any[];
  selected?: boolean;
  showDarkTheme?: boolean;
  isMobile?: boolean;
};

class MenuWithLinks extends React.PureComponent<Props> {
  public state = {
    anchorEl: null,
  };

  public render() {
    const { options, src, alt, children, selected, showDarkTheme, isMobile } = this.props;
    const { anchorEl } = this.state;

    return (
      <React.Fragment>
        <div
          aria-owns={anchorEl ? 'simple-menu' : null}
          aria-haspopup="true"
          onClick={this.handleClick}
          onKeyPress={this.handleClick}
          style={{ margin: isMobile ? '15px 20px 0 10px' : 'none' }}
        >
          {children || (
            <Avatar
              role="presentation"
              src={src}
              alt={alt}
              style={{
                margin: '0px 20px 0px auto',
                cursor: 'pointer',
                borderBottom: selected
                  ? showDarkTheme
                    ? '2px solid #fff'
                    : '2px solid #222'
                  : null,
              }}
            />
          )}
        </div>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
        >
          {options.map((option, i) =>
            option.separator ? (
              <hr style={{ width: '95%', margin: '10px auto' }} key={`separated-${i}`} />
            ) : option.externalServer ? (
              <MenuItem
                onClick={() => {
                  if (option.onClick) {
                    option.onClick();
                  } else {
                    window.location.href = option.href;
                  }

                  this.handleClose();
                }}
                key={option.href || option.text}
              >
                {option.text}
              </MenuItem>
            ) : (
              <MenuItem key={option.href || option.text}>
                <Link key={option.href || option.text} href={option.href} as={option.as} passHref>
                  <a>{option.text}</a>
                </Link>
              </MenuItem>
            ),
          )}
        </Menu>
      </React.Fragment>
    );
  }

  private handleClick = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  private handleClose = () => {
    this.setState({ anchorEl: null });
  };
}

export default MenuWithLinks;
