import { observer } from 'mobx-react';
import { NextRouter, withRouter } from 'next/router';
import * as React from 'react';

import { Store } from '../../lib/store';
import SidebarListItem from '../common/SidebarListItem';

type Props = {
  store: Store;
  isMobile: boolean;
  router: NextRouter;
  teamId: string;
  arrayOfMenuItems: any[];
};

class SettingsMenu extends React.Component<Props> {
  public render() {
    const { router, store, teamId, arrayOfMenuItems } = this.props;
    const { pathname } = router;

    return (
      <div>
        {arrayOfMenuItems.map((i) => (
          <div key={i.href}>
            {i.href.includes('/team-settings') ? (
              <p style={{ textAlign: 'center', marginTop: '20px', marginBottom: '25px' }}>
                Team Settings
              </p>
            ) : null}
            {i.text === 'My Account' ? (
              <>
                <p style={{ textAlign: 'center', marginTop: '20px', marginBottom: '25px' }}>
                  My Settings
                </p>
              </>
            ) : null}

            <SidebarListItem
              store={store}
              isSelected={pathname.includes(i.as.split('settings/')[1])}
              href={i.href}
              as={i.as}
              text={i.text}
              key={i.href}
              isMobile={this.props.isMobile}
              teamId={teamId}
            />
          </div>
        ))}
      </div>
    );
  }
}

export default withRouter<Props>(observer(SettingsMenu));
