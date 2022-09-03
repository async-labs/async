import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import React from 'react';

class MenuWithMenuItems extends React.PureComponent<{
  menuOptions: any;
  itemOptions: any[];
  inline?: boolean;
}> {
  public state = {
    menuElm: null,
  };

  public render() {
    const { menuOptions, itemOptions, inline = false } = this.props;
    const { menuElm } = this.state;

    return (
      <div style={{ verticalAlign: 'middle', display: inline ? 'inline' : 'inherit' }}>
        {!menuOptions.text ? (
          <i
            aria-owns={menuElm ? menuOptions.id : null}
            data-id={menuOptions.dataId}
            aria-haspopup="true"
            style={{ fontSize: '16px', opacity: 0.7, cursor: 'pointer', verticalAlign: 'middle' }}
            className="material-icons"
            onClick={(e) => this.handleClick(e)}
          >
            more_vert
          </i>
        ) : (
          <React.Fragment>
            <span onClick={(e) => this.handleClick(e)}>
              {menuOptions.text}{' '}
              <i className="material-icons" color="action" style={{ verticalAlign: 'bottom' }}>
                arrow_drop_down
              </i>
            </span>
          </React.Fragment>
        )}

        <Menu
          id={menuOptions.id}
          anchorEl={menuElm}
          open={Boolean(menuElm)}
          onClose={this.handleClose}
        >
          {itemOptions.map((option, i) => (
            <MenuItem
              key={option.dataId + i}
              data-id={option.dataId}
              data-more-id={option.dataMoreId}
              onClick={(e) => {
                this.setState({ menuElm: null });
                option.onClick(e);
              }}
            >
              {option.text}
            </MenuItem>
          ))}
        </Menu>
      </div>
    );
  }

  private handleClick = (event) => {
    event.preventDefault();
    this.setState({ menuElm: event.currentTarget });
  };

  private handleClose = () => {
    this.setState({ menuElm: null });
  };
}

export default MenuWithMenuItems;
