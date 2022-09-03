import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import TextField from '@mui/material/TextField';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import moment from 'moment';
import Head from 'next/head';
import NProgress from 'nprogress';
import * as React from 'react';
import { loadStripe } from '@stripe/stripe-js';

import Layout from '../../components/layout';
import SettingsMenu from '../../components/settings/SettingsMenu';
// import confirm from '../../lib/confirm';
import notify from '../../lib/notify';
import { fetchCheckoutSessionApiMethod } from '../../lib/api/to-api-server-team-leader';
import { Store } from '../../lib/store';

const dev = process.env.NODE_ENV !== 'production';
// const URL_APP = dev ? process.env.NEXT_PUBLIC_URL_APP : process.env.NEXT_PUBLIC_PRODUCTION_URL_APP;

type Props = {
  store: Store;
  message?: string;
  isMobile: boolean;
  teamId: string;
};

type State = {
  showInvoices: boolean;
  disabled: boolean;
  disabledForPlan: boolean;
};

class MyBillingPage extends React.Component<Props, State> {
  public static getInitialProps({ query }) {
    const { message } = query;

    return { message };
  }

  constructor(props: Props) {
    super(props);

    this.state = {
      showInvoices: false,
      disabled: false,
      disabledForPlan: false,
    };
  }

  public componentDidMount() {
    const { message } = this.props;

    if (message) {
      notify(message);
    }
  }

  public render() {
    const { isMobile, store } = this.props;
    const { currentUser } = store;

    const sub = currentUser.stripeSubscription;

    let subscriptionDate, billingDay, cancelDate, canceledDate;

    if (sub && sub.billing_cycle_anchor) {
      subscriptionDate = moment(sub.billing_cycle_anchor * 1000).format('MMMM Do YYYY');
      billingDay = moment(sub.billing_cycle_anchor * 1000).format('Do');
    } else {
      subscriptionDate = null;
      billingDay = null;
    }

    if (sub && sub.cancel_at) {
      cancelDate = moment(sub.cancel_at * 1000).format('MMMM Do YYYY');
    } else {
      cancelDate = null;
    }

    if (sub && sub.canceled_at) {
      canceledDate = moment(sub.canceled_at * 1000).format('MMMM Do YYYY');
    } else {
      canceledDate = null;
    }

    const { stripeCard } = currentUser;

    const cardInfo =
      stripeCard && stripeCard.brand && stripeCard.last4
        ? `${stripeCard.brand.charAt(0).toUpperCase() + stripeCard.brand.slice(1)} *${
            currentUser.stripeCard.last4
          }  Exp: ${stripeCard.exp_month}/${stripeCard.exp_year}`
        : 'You have not added card information';

    const arrayOfMenuItems = [
      {
        text: 'My Account',
        href: `/settings/my-account`,
        as: `/settings/my-account`,
      },
      {
        text: `My Billing`,
        href: `/settings/my-billing`,
        as: `/settings/my-billing`,
      },
    ];

    const { numberOfUniqueActiveTeamMembers } = currentUser;

    return (
      <Layout {...this.props}>
        <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
          <Head>
            <title>My Billing</title>
            <meta name="description" content="description" />
          </Head>
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
            }}
          >
            <Grid item sm={2} xs={12} style={{ padding: '10px', borderRight: '1px solid #828282' }}>
              <SettingsMenu
                store={store}
                isMobile={isMobile}
                teamId={this.props.teamId}
                arrayOfMenuItems={arrayOfMenuItems}
              />
            </Grid>
            <Grid
              item
              sm={10}
              xs={12}
              style={{
                padding: '20px',
                marginTop: isMobile ? '20px' : 'none',
                borderTop: isMobile ? '1px solid #828282' : 'none',
                borderRight: isMobile ? 'none' : '1px solid #828282',
              }}
            >
              <div
                style={{
                  padding: isMobile ? '0px' : '0px 10px',
                }}
              >
                <h1>Settings {'>'} My Billing</h1>
                <p />
                <div style={{ padding: '10px', width: isMobile ? '95%' : '800px' }}>
                  <li>
                    {currentUser.isSubscriptionActiveForAccount ? (
                      <span>
                        You are paying customer at Async. You subscribed to a paid plan on{' '}
                        <b>{subscriptionDate}</b>.Your charge will occur on <b>{billingDay} day</b>{' '}
                        of each month unless you cancel your subscription or you unsubscribe
                        automatically due to failed payment. Failed payment can occur when your card
                        expires or you provide incorrect card information.
                      </span>
                    ) : (
                      <span>
                        You are <b>not</b> paying customer at Async.
                        {canceledDate && cancelDate ? (
                          <span>
                            {' '}
                            You cancelled your subscription on <b>{canceledDate}</b>. If you
                            re-subscribe to a paid plan before <b>{cancelDate}</b>, you will not be
                            charged until <b>{cancelDate}</b>.
                          </span>
                        ) : null}
                      </span>
                    )}
                  </li>
                  {currentUser.isPaymentFailedForAccount ? (
                    <li>
                      Payment has failed. This is likely due to card expiration or card information
                      that you provided is incorrect.
                    </li>
                  ) : null}
                  <hr style={{ margin: '10px 0' }} />
                  <li>
                    Total amount to be charged{' '}
                    {currentUser.isSubscriptionActiveForAccount ? (
                      <span>
                        on{' '}
                        <b>
                          {moment(currentUser.accountCreationDate).format('MMM Do YYYY') ||
                            moment(new Date()).format('MMM Do YYYY')}
                        </b>{' '}
                      </span>
                    ) : null}
                    depends on the number of people.
                  </li>{' '}
                  <li>
                    Number of people = total number of unique people inside all of your teams plus
                    you.
                  </li>
                  <li>
                    As of now, you have{' '}
                    {numberOfUniqueActiveTeamMembers > 1
                      ? `${numberOfUniqueActiveTeamMembers} people`
                      : `${numberOfUniqueActiveTeamMembers} person`}{' '}
                    in your team.
                  </li>
                  <li>Async costs $5 per person per month.</li>
                  <li>You can cancel your subscription at any time.</li>
                </div>

                <p />

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {!currentUser.isSubscriptionActiveForAccount ? (
                    <>
                      {' '}
                      {cancelDate ? (
                        <Button
                          disabled={this.state.disabled}
                          onClick={this.reSubscribe}
                          variant="contained"
                          color="primary"
                          style={{ verticalAlign: 'middle', marginLeft: '10px' }}
                        >
                          Re-subscribe to a paid plan
                        </Button>
                      ) : (
                        <Button
                          disabled={this.state.disabled}
                          onClick={() => this.handleCheckoutClick('subscription')}
                          variant="contained"
                          color="primary"
                          style={{ verticalAlign: 'middle', marginLeft: '10px' }}
                        >
                          Become a paid customer
                        </Button>
                      )}
                    </>
                  ) : null}
                  {currentUser.isSubscriptionActiveForAccount ? (
                    <Button
                      disabled={this.state.disabled}
                      onClick={this.cancelSubscription}
                      variant="outlined"
                      color="primary"
                      style={{
                        verticalAlign: 'middle',
                        marginLeft: '10px',
                        color: currentUser.showDarkTheme ? '#fff' : '#000',
                        border: currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
                      }}
                    >
                      Cancel subscription
                    </Button>
                  ) : null}
                </div>

                <p />
                <br />
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Payment information</TableCell>
                      <TableCell align="center" style={{ display: 'none' }}>
                        Edit/Save button
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    <TableRow>
                      <TableCell
                        style={{
                          display: isMobile ? 'block' : null,
                          alignItems: 'center',
                        }}
                      >
                        <TextField
                          disabled
                          autoComplete="off"
                          value={cardInfo}
                          label="Card"
                          placeholder="Card"
                          variant="outlined"
                          style={{
                            fontFamily: 'Roboto, sans-serif',
                            margin: isMobile ? '0px' : '10px 20px',
                            minWidth: '320px',
                          }}
                        />
                        <div
                          style={{
                            width: '100%',
                            marginTop: isMobile ? '20px' : '10px',
                          }}
                        >
                          <InfoOutlinedIcon
                            style={{
                              opacity: '60%',
                              marginRight: '5px',
                              fontSize: '20px',
                              verticalAlign: 'middle',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '13px',
                              opacity: '75%',
                            }}
                          >
                            This card information is used for a paid subscription at Async.
                          </span>
                        </div>
                      </TableCell>
                      <TableCell style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: isMobile ? 'block' : 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Button
                            variant="contained"
                            color="primary"
                            disabled={this.state.disabled}
                            onClick={() => {
                              this.handleCheckoutClickForCard('setup');
                            }}
                          >
                            Edit card
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p />
                <br />
                {(currentUser &&
                  moment(new Date()).isBefore(
                    moment(currentUser.trialPeriodStartDate).add(30, 'days'),
                  )) ||
                (currentUser && !currentUser.isSubscriptionActiveForAccount) ? null : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          style={{
                            display: isMobile ? 'block' : null,
                            alignItems: 'center',
                          }}
                        >
                          Payment history
                          <Button
                            disabled={this.state.disabled}
                            onClick={this.fetchAndShowInvoices}
                            variant="contained"
                            color="primary"
                            style={{
                              marginLeft: isMobile ? '0px' : '20px',
                              marginTop: isMobile ? '20px' : '0px',
                            }}
                          >
                            Show paid invoices
                          </Button>
                        </TableCell>

                        <TableCell variant="head" align="center" style={{ display: 'none' }}>
                          Edit/Save button
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell
                          style={{ width: isMobile ? '45%' : '400px', verticalAlign: 'middle' }}
                        >
                          Amount paid, Date of payment, Link to hosted invoice
                        </TableCell>
                        <TableCell align="center" style={{ width: isMobile ? '25%' : '100px' }}>
                          <b>Start</b> of period for invoice
                        </TableCell>
                        <TableCell align="center" style={{ width: isMobile ? '25%' : '100px' }}>
                          <b>End</b> of period for invoice
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    {this.renderInvoices(isMobile)}
                  </Table>
                )}
                <p />
                <br />
              </div>
            </Grid>
          </Grid>
        </div>
      </Layout>
    );
  }

  private handleCheckoutClick = async (mode: string) => {
    // checks

    NProgress.start();
    this.setState({ disabled: true });

    try {
      const { sessionId } = await fetchCheckoutSessionApiMethod({
        teamId: this.props.teamId,
        mode,
      });

      // When the customer clicks on the button, redirect them to Checkout.
      const publishableKey = dev
        ? process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
        : process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY;

      const stripe = await loadStripe(publishableKey);
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        notify(error);
        console.error(error);
      }
    } catch (err) {
      notify(err);
      console.error(err);
    } finally {
      NProgress.done();
      this.setState({ disabled: false });
    }
  };

  private handleCheckoutClickForCard = async (mode: string) => {
    NProgress.start();
    this.setState({ disabled: true });
    try {
      const { sessionId } = await fetchCheckoutSessionApiMethod({
        teamId: this.props.teamId,
        mode,
      });

      const publishableKey = dev
        ? process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
        : process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY;

      const stripe = await loadStripe(publishableKey);
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        notify(error);
        console.error(error);
      }
    } catch (err) {
      notify(
        'There is no card information to edit. Your card information will automatically appear here and be editable after you subscribe to a paid plan.',
      );
      console.error(err);
    } finally {
      NProgress.done();
      this.setState({ disabled: false });
    }
  };

  private fetchAndShowInvoices = async () => {
    const { currentUser } = this.props.store;

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentUser.getListOfInvoicesForAccountStoreMethod(this.props.teamId);
      this.setState({ showInvoices: true });
    } catch (err) {
      notify(err);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private renderInvoices(isMobile) {
    const { currentUser } = this.props.store;
    const { showInvoices } = this.state;

    if (!showInvoices) {
      return null;
    }

    return (
      <TableBody>
        {currentUser && !currentUser.stripeListOfInvoices === null ? (
          <TableRow>
            <TableCell style={{ width: '95%', verticalAlign: 'middle' }} colSpan={3}>
              You are not subscribed to a paid plan.
            </TableCell>
          </TableRow>
        ) : (
          <>
            {currentUser && currentUser.stripeListOfInvoices.data
              ? currentUser.stripeListOfInvoices.data.map((invoice, i) => (
                  <TableRow key={i}>
                    <TableCell
                      style={{
                        width: isMobile ? '45%' : '400px',
                        verticalAlign: 'middle',
                      }}
                    >
                      ${invoice.amount_paid / 100} was paid on{' '}
                      {moment(invoice.created * 1000).format('MMM Do YYYY')} -{' '}
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        See invoice
                      </a>
                    </TableCell>
                    <TableCell align="center" style={{ width: isMobile ? '25%' : '100px' }}>
                      {moment(invoice.period_start * 1000).format('MMM Do YYYY')}
                    </TableCell>
                    <TableCell align="center" style={{ width: isMobile ? '25%' : '100px' }}>
                      {moment(invoice.period_end * 1000).format('MMM Do YYYY')}
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </>
        )}
      </TableBody>
    );
  }

  private reSubscribe = async () => {
    const { currentUser } = this.props.store;

    if (!currentUser.stripeCard) {
      notify('You did not add card information.');
      return;
    }

    if (currentUser.isSubscriptionActiveForAccount) {
      notify('You are already subscribed to a paid plan.');
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentUser.reSubscribeTeamStoreMethod(this.props.teamId);

      notify('You re-subscribed to a paid plan at Async.');
    } catch (err) {
      notify(err);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private cancelSubscription = async () => {
    const { currentUser } = this.props.store;

    if (!currentUser.isSubscriptionActiveForAccount) {
      notify('You are already unsubscribed from paid plan.');
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentUser.cancelSubscriptionForTeamStoreMethod(this.props.teamId);

      notify('You cancelled subscription to a paid plan for this account.');
    } catch (err) {
      notify(err);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };
}

export default MyBillingPage;
