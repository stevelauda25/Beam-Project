import { FormEvent, useEffect, useState } from 'react'
import ProgressBar from './ProgressBar'
import SelectControl from './SelectControl'
import Toggle from './Toggle'

type BillingCycle = 'monthly' | 'annual'
type PlanId = 'free' | 'pro' | 'business'
type DrawerStep = 'plans' | 'confirm'
type Plan = { id: PlanId; name: string; description: string; monthlyPrice: number; annualPrice: number; storage: string; maxFile: string; workspaces: string; members: string; sharing: string; history: string; support: string }
type Card = { brand: string; lastFour: string; expiry: string }

function PaymentBrand({ brand }: { brand: string }) {
  if (brand === 'Visa') return <span className="paymentBrand paymentBrandVisa"><img className="paymentBrandLight" src="/assets/payment-visa.svg" alt="Visa" /><img className="paymentBrandDark" src="/assets/payment-visa-dark.svg" alt="Visa" /></span>
  if (brand === 'Mastercard') return <span className="paymentBrand paymentBrandMastercard"><img src="/assets/payment-mastercard.svg" alt="Mastercard" /></span>
  return <span className="paymentBrand paymentBrandFallback" aria-label={brand}>{brand.slice(0, 2).toUpperCase()}</span>
}

const sections = [['billing-subscription', 'Subscription'], ['billing-usage', 'Usage & limits'], ['billing-receipts', 'Email receipts'], ['billing-details', 'Billing details'], ['billing-invoices', 'Invoices']] as const
const plans: Plan[] = [
  { id: 'free', name: 'Free', description: 'For personal projects and getting started.', monthlyPrice: 0, annualPrice: 0, storage: '5 GB', maxFile: '250 MB', workspaces: '3', members: '1', sharing: 'Public links', history: '7 days', support: 'Community' },
  { id: 'pro', name: 'Pro', description: 'For professionals managing active projects.', monthlyPrice: 12, annualPrice: 9, storage: '1 TB', maxFile: '10 GB', workspaces: 'Unlimited', members: '5', sharing: 'Password + expiry', history: '90 days', support: 'Priority email' },
  { id: 'business', name: 'Business', description: 'For teams that need control and security.', monthlyPrice: 24, annualPrice: 19, storage: '5 TB', maxFile: '50 GB', workspaces: 'Unlimited', members: 'Unlimited', sharing: 'Advanced controls', history: 'Unlimited', support: 'Dedicated' },
]
const invoices = [
  { id: 'INV-2026-0084', date: 'Aug 1, 2026', period: 'Aug 1 – Aug 31, 2026', plan: 'Pro · Monthly', amount: '$12.00', status: 'Paid' },
  { id: 'INV-2026-0071', date: 'Jul 1, 2026', period: 'Jul 1 – Jul 31, 2026', plan: 'Pro · Monthly', amount: '$12.00', status: 'Paid' },
  { id: 'INV-2026-0058', date: 'Jun 1, 2026', period: 'Jun 1 – Jun 30, 2026', plan: 'Pro · Monthly', amount: '$12.00', status: 'Paid' },
  { id: 'INV-2026-0042', date: 'May 1, 2026', period: 'May 1 – May 31, 2026', plan: 'Pro · Monthly', amount: '$12.00', status: 'Refunded' },
] as const
const initialBillingDetails = { name: 'Michele J.', country: 'Indonesia', address: 'Jl. Sunset Road No. 88', city: 'Denpasar', postalCode: '80361', taxId: '12.345.678.9-012.000' }

const priceFor = (plan: Plan, cycle: BillingCycle) => cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
const money = (value: number) => `$${value.toFixed(2)}`

export default function BillingUsagePage() {
  const [activeSection, setActiveSection] = useState('billing-subscription')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>('free')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState<DrawerStep>('plans')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [cards, setCards] = useState<Card[]>([{ brand: 'Visa', lastFour: '4242', expiry: '08/29' }])
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null)
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancellationScheduled, setCancellationScheduled] = useState(false)
  const [primaryReceiptEmail, setPrimaryReceiptEmail] = useState('michele@beam.app')
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(['finance@company.com', 'tech@company.com'])
  const [emailDraft, setEmailDraft] = useState('')
  const [isAddingReceipt, setIsAddingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [usageAlert, setUsageAlert] = useState('80%')
  const [autoUpgrade, setAutoUpgrade] = useState(false)
  const [billingDetails, setBillingDetails] = useState(initialBillingDetails)
  const [billingDetailsDraft, setBillingDetailsDraft] = useState(initialBillingDetails)
  const [isEditingBillingDetails, setIsEditingBillingDetails] = useState(false)
  const [toast, setToast] = useState('')

  const currentPlan = plans.find((plan) => plan.id === currentPlanId) ?? plans[0]
  const card = cards[0] ?? null
  const currentPlanIndex = plans.findIndex((plan) => plan.id === currentPlanId)
  const selectedPlanIndex = selectedPlan ? plans.findIndex((plan) => plan.id === selectedPlan.id) : -1
  const isDowngrade = selectedPlanIndex >= 0 && selectedPlanIndex < currentPlanIndex
  const remainingRatio = 0.5
  const unusedCredit = priceFor(currentPlan, billingCycle) * remainingRatio
  const remainingPlanCharge = selectedPlan ? priceFor(selectedPlan, billingCycle) * remainingRatio : 0
  const dueToday = Math.max(0, remainingPlanCharge - unusedCredit)

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }
  const openSection = (id: string) => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const openPlanDrawer = () => { setDrawerStep('plans'); setSelectedPlan(null); setDrawerOpen(true) }
  const choosePlan = (plan: Plan) => { setSelectedPlan(plan); setDrawerStep('confirm') }
  const closeDrawer = () => { setDrawerOpen(false); setDrawerStep('plans'); setSelectedPlan(null) }

  useEffect(() => {
    if (!drawerOpen && !cardDialogOpen && !cancelDialogOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDrawerOpen(false); setCardDialogOpen(false); setCancelDialogOpen(false) } }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [drawerOpen, cardDialogOpen, cancelDialogOpen])

  const confirmPlanChange = () => {
    if (!selectedPlan) return
    if (selectedPlan.monthlyPrice > 0 && !card) { setDrawerOpen(false); setCardDialogOpen(true); notify('Add a payment method to finish upgrading.'); return }
    setCurrentPlanId(selectedPlan.id)
    notify(isDowngrade ? `${selectedPlan.name} starts September 19.` : `${selectedPlan.name} is active. ${money(dueToday)} charged today.`)
    closeDrawer()
  }

  const addReceiptEmail = () => {
    const email = emailDraft.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setReceiptError('Enter a valid email address.'); return false }
    if (email === primaryReceiptEmail.toLowerCase() || additionalEmails.includes(email)) { setReceiptError('This recipient already receives receipts.'); return false }
    setAdditionalEmails((current) => [...current, email]); setEmailDraft(''); setReceiptError(''); return true
  }

  const downloadInvoice = (invoice: typeof invoices[number]) => {
    const receipt = `Beam receipt\n\nInvoice: ${invoice.id}\nIssued: ${invoice.date}\nBilling period: ${invoice.period}\nPlan: ${invoice.plan}\nStatus: ${invoice.status}\nTotal: ${invoice.amount}\n`
    const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain' }))
    const link = document.createElement('a'); link.href = url; link.download = `${invoice.id}.txt`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return <main className="billingPage" aria-labelledby="billing-title">
    <header className="accountPageHeader"><h1 id="billing-title">Billing &amp; usage</h1></header>
    <div className="accountSettingsLayout">
      <nav className="accountSectionNav" aria-label="Billing and usage sections">{sections.map(([id, label]) => <button className={activeSection === id ? 'active' : ''} type="button" key={id} onClick={() => openSection(id)}>{label}</button>)}</nav>
      <div className="accountPageContent billingContent">
        <section className="profileGroup billingSubscription" id="billing-subscription" aria-labelledby="billing-subscription-title">
          <header><h2 id="billing-subscription-title">Current subscription</h2></header>
          <div className="subscriptionSummary"><div className="subscriptionIdentity"><div><span className="subscriptionPlanName">Beam - {currentPlan.name} Plan</span><small>{billingCycle === 'annual' ? 'Annual billing' : 'Monthly billing'} · Personal workspace</small></div></div><button className="subscriptionUpgrade" type="button" onClick={openPlanDrawer}><img src="/assets/billing-upgrade.svg" alt="" />Upgrade plan</button></div>
          <div className="subscriptionFacts"><div><span>Next renewal</span><strong>{currentPlan.id === 'free' ? 'No renewal' : 'September 19, 2026'}</strong></div><div><span>Next charge</span><strong>{currentPlan.id === 'free' ? '$0.00' : money(billingCycle === 'annual' ? priceFor(currentPlan, billingCycle) * 12 : priceFor(currentPlan, billingCycle))}</strong></div><div><span>Storage</span><strong>1.2 GB of {currentPlan.storage}</strong></div></div>
          {cancellationScheduled && <div className="subscriptionCancellationNotice"><div><span>Cancellation scheduled</span><small>Your {currentPlan.name} plan remains active until September 19, 2026. Your files will not be deleted.</small></div><button type="button" onClick={() => { setCancellationScheduled(false); notify('Your subscription will continue.') }}>Keep subscription</button></div>}
        </section>

        <section className="profileGroup" id="billing-usage" aria-labelledby="billing-usage-title"><header><h2 id="billing-usage-title">Usage &amp; limits</h2></header>
          <div className="billingUsageBlock"><div className="billingUsageHeading"><span>Storage used</span><span>24% used</span></div><ProgressBar value={24} label="Storage used" /><div className="billingUsageFooter"><span>1,276 MB <em>of {currentPlan.storage}</em></span><span>3.8 GB available</span></div></div>
          <div className="profileRow"><div><span>Usage notification</span><small>Email workspace owners when storage reaches this level.</small></div><SelectControl className="billingThresholdSelect" value={usageAlert} options={['80%', '90%', '100%']} label="Usage notification threshold" onChange={setUsageAlert} /></div>
          <div className="profileRow"><div><span>Automatic upgrade</span><small>Move to the next plan before new uploads are paused.</small></div><Toggle checked={autoUpgrade} onChange={setAutoUpgrade} label="Automatic upgrade" /></div>
        </section>

        <section className="profileGroup figmaPaymentMethods" id="billing-payment" aria-labelledby="billing-payment-title"><header><h2 id="billing-payment-title">Payment methods</h2><button type="button" onClick={() => { setEditingCardIndex(null); setCardDialogOpen(true) }}>＋ Add more</button></header>{cards.length ? <div className="billingPaymentList">{cards.map((paymentCard, index) => <div className="billingPaymentCard" key={`${paymentCard.brand}-${paymentCard.lastFour}-${index}`}><div className="paymentCardIdentity"><PaymentBrand brand={paymentCard.brand} /><div><div><strong>{paymentCard.brand} ending in {paymentCard.lastFour}</strong>{index === 0 && <span className="paymentDefaultBadge">Default</span>}</div><small>Expires {paymentCard.expiry}{index === 0 ? ' · Default payment method' : ''}</small></div></div><div>{index > 0 && <button className="setDefaultPayment" type="button" onClick={() => { setCards((current) => [current[index], ...current.filter((_, cardIndex) => cardIndex !== index)]); notify(`${paymentCard.brand} ending in ${paymentCard.lastFour} is now the default payment method.`) }}>Set as default</button>}<button type="button" onClick={() => { setEditingCardIndex(index); setCardDialogOpen(true) }}>Edit</button></div></div>)}</div> : <div className="billingPaymentEmpty"><div><span>No payment method</span><small>Add a card before upgrading to a paid plan.</small></div><button type="button" onClick={() => { setEditingCardIndex(null); setCardDialogOpen(true) }}>Add payment method</button></div>}</section>

        <section className="profileGroup figmaReceipts" id="billing-receipts" aria-labelledby="billing-receipts-title"><header><h2 id="billing-receipts-title">Email receipts</h2></header>
          <div className="receiptPrimary"><div><span>Primary billing email</span><div className="receiptPrimaryRow"><div className="receiptValue"><div className="receiptValueMain"><span>{primaryReceiptEmail}</span><button type="button" aria-label="Edit primary billing email"><img src="/assets/billing-pencil.svg" alt="" /></button></div></div><button className="receiptSendTest" type="button" onClick={() => notify(`Test receipt sent to ${primaryReceiptEmail}.`)}><img src="/assets/billing-send.svg" alt="" />Send test</button></div></div></div>
          <div className="receiptRecipients"><div><span>Additional recipients</span></div>{additionalEmails.map((email) => <div className="receiptRecipient" key={email}><div className="receiptRecipientMain"><span>{email}</span><button type="button" aria-label={`Edit ${email}`}><img src="/assets/billing-pencil.svg" alt="" /></button></div><button type="button" aria-label={`Remove ${email}`} onClick={() => setAdditionalEmails((current) => current.filter((item) => item !== email))}><img src="/assets/billing-close.svg" alt="" /></button></div>)}{isAddingReceipt ? <div className="receiptAdd"><div className="receiptAddField"><input autoFocus type="email" aria-label="Additional receipt email" placeholder="media@company.com" value={emailDraft} onChange={(event) => { setEmailDraft(event.target.value); setReceiptError('') }} onKeyDown={(event) => { if (event.key === 'Enter' && addReceiptEmail()) setIsAddingReceipt(false); if (event.key === 'Escape') { setIsAddingReceipt(false); setReceiptError(''); setEmailDraft('') } }} /><button type="button" onClick={() => { if (addReceiptEmail()) setIsAddingReceipt(false) }}><img src="/assets/billing-plus.svg" alt="" />Add</button></div><button className="receiptAddCancel" type="button" aria-label="Cancel adding recipient" onClick={() => { setIsAddingReceipt(false); setReceiptError(''); setEmailDraft('') }}><img src="/assets/billing-close.svg" alt="" /></button></div> : <button className="receiptAddMore" type="button" onClick={() => setIsAddingReceipt(true)}>Add more<img src="/assets/billing-plus.svg" alt="" /></button>}{receiptError && <span className="billingFieldError" role="alert">{receiptError}</span>}</div>
        </section>

        <section className="profileGroup figmaBillingDetails" id="billing-details" aria-labelledby="billing-details-title"><header><h2 id="billing-details-title">Billing address &amp; tax ID</h2>{isEditingBillingDetails ? <div className="billingDetailsHeaderActions"><button className="cancel" type="button" onClick={() => { setBillingDetailsDraft(billingDetails); setIsEditingBillingDetails(false) }}>Cancel</button><button className="save" type="submit" form="billing-details-form">Save</button></div> : <button type="button" onClick={() => { setBillingDetailsDraft(billingDetails); setIsEditingBillingDetails(true) }}><img src="/assets/billing-details-edit.svg" alt="" />Edit</button>}</header>{isEditingBillingDetails ? <form id="billing-details-form" className="billingDetailsForm" onSubmit={(event) => { event.preventDefault(); setBillingDetails(billingDetailsDraft); setIsEditingBillingDetails(false); notify('Billing details saved for future invoices.') }}><label>Full or company name<input required value={billingDetailsDraft.name} onChange={(event) => setBillingDetailsDraft({ ...billingDetailsDraft, name: event.target.value })} /></label><label>Country or region<SelectControl className="billingCountrySelect" label="Country or region" value={billingDetailsDraft.country} options={['Indonesia', 'Singapore', 'United States']} onChange={(country) => setBillingDetailsDraft({ ...billingDetailsDraft, country })} /></label><label className="wide">Address<input required value={billingDetailsDraft.address} onChange={(event) => setBillingDetailsDraft({ ...billingDetailsDraft, address: event.target.value })} /></label><label>City<input required value={billingDetailsDraft.city} onChange={(event) => setBillingDetailsDraft({ ...billingDetailsDraft, city: event.target.value })} /></label><label>Postal code<input required value={billingDetailsDraft.postalCode} onChange={(event) => setBillingDetailsDraft({ ...billingDetailsDraft, postalCode: event.target.value })} /></label><label className="wide">Tax ID <span>Optional</span><input value={billingDetailsDraft.taxId} onChange={(event) => setBillingDetailsDraft({ ...billingDetailsDraft, taxId: event.target.value })} /></label></form> : <div className="billingDetailsSummary"><div><span>Billing name</span><strong>{billingDetails.name}</strong></div><div><span>Address</span><strong>{billingDetails.address}<br />{billingDetails.city}, {billingDetails.postalCode}<br />{billingDetails.country}</strong></div><div><span>Tax ID</span><strong>{billingDetails.taxId || 'Not provided'}</strong></div></div>}</section>

        <section className="figmaInvoices" id="billing-invoices" aria-label="Invoices"><div className="billingInvoiceHeader" aria-hidden="true"><span>Invoice</span><span>Plan</span><span>Status</span><span>Amount</span><span /></div><div className="billingInvoiceList">{invoices.map((invoice) => <article className="billingInvoiceRow" key={invoice.id}><div className="invoiceIdentity"><strong>{invoice.id}</strong><small>{invoice.date} · {invoice.period}</small></div><span>{invoice.plan}</span><span><em className={invoice.status.toLowerCase()}>{invoice.status}</em></span><strong>{invoice.amount}</strong><div className="invoiceActions"><button type="button" title="Email invoice" aria-label={`Email ${invoice.id}`} onClick={() => notify(`${invoice.id} emailed to ${primaryReceiptEmail}.`)}><img src="/assets/billing-invoice-email.svg" alt="" /></button><button type="button" title="Download invoice" aria-label={`Download ${invoice.id}`} onClick={() => downloadInvoice(invoice)}><img src="/assets/billing-invoice-download.svg" alt="" /></button></div></article>)}</div></section>
        {currentPlan.id !== 'free' && <section className="billingCancelPlan" aria-labelledby="cancel-plan-title"><div><h2 id="cancel-plan-title">Cancel plan</h2><p>{cancellationScheduled ? `Your ${currentPlan.name} plan is scheduled to end on September 19, 2026.` : "If you cancel, you'll keep full access to your plan features until the end of your billing period."}</p></div><button type="button" onClick={() => { if (cancellationScheduled) { setCancellationScheduled(false); notify('Your subscription will continue.') } else setCancelDialogOpen(true) }}>{cancellationScheduled ? 'Keep plan' : 'Cancel'}</button></section>}
      </div>
    </div>

    {toast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Billing updated</strong><span>{toast}</span></div></div>}

    {drawerOpen && <div className="subscriptionDrawerBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer() }}><aside className={`subscriptionDrawer${drawerStep === 'confirm' ? ' confirmStep' : ''}`} role="dialog" aria-modal="true" aria-labelledby="subscription-drawer-title"><header><div>{drawerStep === 'confirm' && <button className="drawerBack" type="button" onClick={() => setDrawerStep('plans')}>←</button>}<img className="planModalIcon" src="/assets/plan-modal-icon.svg" alt="" /><h2 id="subscription-drawer-title">{drawerStep === 'plans' ? 'Choose your plan' : `Switch to ${selectedPlan?.name}`}</h2></div><button className="drawerClose" type="button" aria-label="Close subscription plans" onClick={closeDrawer}><img src="/assets/plan-modal-close.svg" alt="" /></button></header>
      {drawerStep === 'plans' ? <div className="drawerBody"><div className="drawerPlanGrid">{plans.map((plan, index) => { const isCurrent = plan.id === currentPlanId; return <article className={`drawerPlanCard${plan.id === 'pro' ? ' recommended' : ''}`} key={plan.id}><div><h3>{plan.name}</h3>{!isCurrent && plan.id === 'pro' ? <span className="recommendedBadge">Recommended</span> : null}</div><p>{plan.description}</p><div className="drawerPlanPrice"><strong>${priceFor(plan, billingCycle)}</strong><span>/ month</span></div><button type="button" disabled={isCurrent} onClick={() => choosePlan(plan)}>{isCurrent ? 'Current plan' : index < currentPlanIndex ? `Downgrade to ${plan.name}` : `Upgrade to ${plan.name}`}</button><ul><li>{plan.storage} storage</li><li>Files up to {plan.maxFile}</li><li>{plan.workspaces} workspaces</li><li>{plan.members} members</li><li>{plan.sharing}</li><li>{plan.history} history</li></ul></article>})}</div><section className="enterpriseBanner"><p>Need higher limits, advanced controls, or a plan built around your team’s needs?</p><button type="button" onClick={() => notify('Enterprise consultation requested.')}><img src="/assets/plan-contact.svg" alt="" />Talk to our team</button></section></div> : selectedPlan && <div className="drawerConfirm"><div className="drawerChangeSummary"><div><span>{currentPlan.name}</span><small>Current plan</small></div><span>→</span><div><span>{selectedPlan.name}</span><small>{billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing</small></div></div>{isDowngrade ? <div className="billingDowngradeNotice"><strong>No charge today</strong><p>{selectedPlan.name} starts September 19. Your current features remain active until then, and existing files stay safe if you exceed the new limit.</p></div> : <><div className="prorationIntro"><span>Prorated upgrade</span><p>You only pay for the 15 days remaining in this billing period.</p></div><dl className="prorationBreakdown"><div><dt>{selectedPlan.name} for remaining 15 days</dt><dd>{money(remainingPlanCharge)}</dd></div><div><dt>Unused time on {currentPlan.name}</dt><dd>−{money(unusedCredit)}</dd></div><div><dt>Tax</dt><dd>Calculated at checkout</dd></div><div className="prorationTotal"><dt>Due today</dt><dd>{money(dueToday)}</dd></div></dl></>}<div className="drawerRenewal"><span>Next renewal</span><strong>September 19, 2026 · {money(billingCycle === 'annual' ? priceFor(selectedPlan, billingCycle) * 12 : priceFor(selectedPlan, billingCycle))}</strong></div><div className="drawerPayment"><span>Payment method</span><strong>{card ? `${card.brand} ending in ${card.lastFour}` : 'No payment method'}</strong></div><footer><button type="button" onClick={() => setDrawerStep('plans')}>Back</button><button className="confirm" type="button" onClick={confirmPlanChange}>{isDowngrade ? 'Schedule downgrade' : card ? `Pay ${money(dueToday)} & upgrade` : 'Add card & continue'}</button></footer><p className="pricingDisclaimer">Final tax and proration are calculated securely by the billing provider before any charge.</p></div>}
    </aside></div>}

    {cardDialogOpen && <div className="billingModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCardDialogOpen(false) }}><AddCardDialog initialCard={editingCardIndex === null ? null : cards[editingCardIndex]} onClose={() => { setCardDialogOpen(false); setEditingCardIndex(null) }} onSave={(nextCard) => { setCards((current) => editingCardIndex === null ? [...current, nextCard] : current.map((savedCard, index) => index === editingCardIndex ? nextCard : savedCard)); setCardDialogOpen(false); setEditingCardIndex(null); if (selectedPlan) { setDrawerStep('confirm'); setDrawerOpen(true) }; notify(editingCardIndex === null ? 'Payment method added.' : 'Payment method updated.') }} /></div>}
    {cancelDialogOpen && <div className="billingModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCancelDialogOpen(false) }}><section className="billingConfirmModal cancelSubscriptionDialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-subscription-title"><header><div><span>Subscription</span><h2 id="cancel-subscription-title">Cancel {currentPlan.name} subscription?</h2></div><button type="button" aria-label="Close" onClick={() => setCancelDialogOpen(false)}>×</button></header><div className="cancelSubscriptionBody"><div><span>Your plan remains active until</span><strong>September 19, 2026</strong></div><p>After that date, your workspace moves to Free. Existing files remain available, but new uploads pause if your usage exceeds the 5 GB Free limit.</p><ul><li>No charge today</li><li>Automatic renewal will be turned off</li><li>You can undo cancellation before September 19</li></ul></div><footer><button type="button" onClick={() => setCancelDialogOpen(false)}>Keep subscription</button><button className="cancelConfirm" type="button" onClick={() => { setCancellationScheduled(true); setCancelDialogOpen(false); notify('Cancellation scheduled for September 19.') }}>Confirm cancellation</button></footer></section></div>}
  </main>
}

function AddCardDialog({ initialCard, onClose, onSave }: { initialCard: Card | null; onClose: () => void; onSave: (card: Card) => void }) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState(initialCard?.expiry ?? '')
  const [cvc, setCvc] = useState('')
  const formatCardNumber = (value: string) => (value.replace(/\D/g, '').slice(0, 19).match(/.{1,4}/g) ?? []).join(' ')
  const formatExpiry = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 4); return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits }
  const submit = (event: FormEvent) => { event.preventDefault(); const digits = cardNumber.replace(/\D/g, ''); if (digits.length < 12 || expiry.length !== 5 || cvc.length < 3) return; onSave({ brand: digits.startsWith('4') ? 'Visa' : 'Mastercard', lastFour: digits.slice(-4), expiry }) }
  return <section className="billingConfirmModal addCardDialog" role="dialog" aria-modal="true" aria-labelledby="add-card-title"><header><div><img src="/assets/add-card-icon.svg" alt="" /><h2 id="add-card-title">{initialCard ? 'Edit card' : 'Add a new card'}</h2></div><button type="button" aria-label="Close" onClick={onClose}><img src="/assets/add-card-close.svg" alt="" /></button></header><form onSubmit={submit}><div className="addCardFields"><label>Card number<input autoFocus required inputMode="numeric" autoComplete="cc-number" maxLength={23} placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(event) => setCardNumber(formatCardNumber(event.target.value))} /></label><div><label>Expiry<input required inputMode="numeric" autoComplete="cc-exp" maxLength={5} placeholder="MM/YY" value={expiry} onChange={(event) => setExpiry(formatExpiry(event.target.value))} /></label><label>Security code<input required inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="CVC" value={cvc} onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))} /></label></div></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="confirm" type="submit"><img src="/assets/add-card-check.svg" alt="" />Save payment method</button></footer></form></section>
}
