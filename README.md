# GigShield AI - AI Powered Parametric Insurance for Gig Workers

A comprehensive React frontend platform that protects delivery partners (Zomato, Swiggy, Zepto, Amazon etc.) from income loss caused by external disruptions like heavy rain, extreme heat, floods, pollution or curfews.

## 🚀 Features

### For Delivery Partners (Workers)

- **Worker Dashboard** - View insurance summary, earnings protection, and claims history
- **Policy Management** - Activate, pause, or cancel insurance policies
- **Automatic Claims** - Parametric triggers automatically process claims during disruptions
- **Real-time Alerts** - Instant notifications when claims are approved and paid

### For Admins

- **Platform Metrics** - Track workers insured, active policies, premiums, and payouts
- **Claims Overview** - Monitor daily, weekly, and total claims
- **Fraud Detection** - AI-powered fraud alerts for suspicious claims
- **Risk Zones** - Geographic risk assessment visualization

### Key Characteristics

- ✅ Loss of income insurance ONLY (no health/accident/life/vehicle)
- ✅ Weekly-based insurance pricing
- ✅ Automatic claims through parametric events
- ✅ Clean, minimal, professional UI
- ✅ Responsive design for all devices

## 🛠️ Tech Stack

### Frontend

- **React 19** with Vite
- **React Router DOM** for routing
- **Axios** for API calls
- **CSS3** with modern styling
- **Functional Components** with Hooks

### Backend

- **Node.js** with Express.js
- **MySQL** with Sequelize ORM
- **JWT** for authentication
- **bcryptjs** for password hashing

### AI Engine

- **Python** with scikit-learn
- **pandas** for data processing
- **Machine Learning** for risk assessment

### External Services

- **OpenWeatherMap API** for weather data
- **Stripe** for payments

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Navigation bar component
│   ├── WorkerCard.jsx      # Worker insurance summary card
│   ├── ClaimAlert.jsx      # Claim notification component
│   └── StatCard.jsx        # Statistics card component
├── pages/
│   ├── Home.jsx            # Landing page
│   ├── Login.jsx           # User login page
│   ├── Register.jsx        # User registration page
│   ├── WorkerDashboard.jsx # Worker dashboard
│   ├── PolicyPage.jsx      # Policy management page
│   └── AdminDashboard.jsx  # Admin dashboard
├── services/
│   ├── api.js              # Axios instance configuration
│   ├── authService.js      # Authentication functions
│   └── claimService.js     # Claims management functions
├── styles/
│   └── dashboard.css       # Global styles
├── App.jsx                 # Main app component with routing
└── main.jsx                # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MySQL Server (v8.0 or higher)
- Python 3.8+ (for AI engine)

### Database Setup

1. Install and start MySQL Server
2. Create the database:
   - Open MySQL Workbench or command line
   - Run: `CREATE DATABASE gig_shield;`
   - Or use the provided `database-setup.sql` file

3. Update `.env` file with your MySQL credentials:
   ```
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   ```

### Installation

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Start the backend server:

```bash
cd backend
npm start
```

4. Start the frontend development server:

```bash
cd frontend
npm start
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
  npm run dev

```

3. Open browser and navigate to:
```

http://localhost:5173

```

## 📱 Available Routes

- `/` - Landing page with features and how it works
- `/login` - User login
- `/register` - New user registration
- `/dashboard` - Worker dashboard (protected)
- `/policy` - Policy management (protected)
- `/admin` - Admin dashboard (protected)

## 🎨 Design Features

### Color Scheme
- Primary gradient: Purple to violet (#667eea to #764ba2)
- Success states: Green (#28a745)
- Warning states: Yellow/Orange (#ffc107)
- Danger states: Red (#dc3545)

### UI Components
- **Cards** - Clean white cards with subtle shadows
- **Tables** - Responsive data tables with hover effects
- **Badges** - Color-coded status indicators
- **Buttons** - Gradient buttons with hover animations
- **Alerts** - Slide-in notifications

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px
- Flexible grid layouts
- Touch-friendly buttons

## 🔌 API Integration (Mock)

The application uses mocked services for prototype purposes:

### Base URL
```

http://localhost:5000/api

```

### Services
- **authService.js** - Login, register, logout
- **claimService.js** - Get claims, submit claims
- **api.js** - Axios instance with interceptors

To connect to real backend:
1. Update base URL in `src/services/api.js`
2. Uncomment actual API calls in service files
3. Remove mock data responses

## 📊 Sample Data

The application includes realistic mock data for:
- Worker profiles (name, platform, location)
- Insurance policies (premiums, coverage limits)
- Claims history (dates, disruptions, amounts)
- Admin statistics (metrics, fraud alerts, risk zones)

## 🎯 Use Cases

### Example Scenarios

1. **Heavy Rain Disruption**
   - Weather API detects heavy rainfall in worker's area
   - System automatically triggers insurance claim
   - Worker receives alert: "Disruption detected in your area"
   - ₹150 credited to account instantly

2. **Flood Event**
   - Flood warning issued for specific zone
   - All workers in that zone automatically covered
   - Claims processed without manual intervention
   - Direct bank transfer within minutes

3. **Extreme Heat Wave**
   - Temperature exceeds threshold (e.g., 45°C)
   - Parametric trigger activates coverage
   - Workers compensated for lost income

## 🔐 Security Notes

For production deployment:
- Implement JWT authentication
- Add protected route guards
- Secure API endpoints
- Validate all user inputs
- Implement CSRF protection
- Use HTTPS in production

## 📝 Future Enhancements

- [ ] Real-time weather API integration
- [ ] GPS-based disruption detection
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Mobile app version
- [ ] Analytics dashboard
- [ ] Export reports (PDF/Excel)

## 👥 Target Users

Delivery partners working with:
- Zomato
- Swiggy
- Zepto
- Amazon
- Flipkart
- Other gig platforms

## 💡 What Makes This Special

1. **Parametric Insurance** - No claims paperwork, automatic payouts
2. **Weekly Pricing** - Flexible premiums based on real-time risk
3. **AI-Powered** - Smart risk assessment and fraud detection
4. **Income Protection** - Focused solely on loss of earnings
5. **Instant Payouts** - Money credited within minutes

## 📄 License

This is a hackathon project prototype.

## 🙏 Acknowledgments

Built for the AI Powered Parametric Insurance Hackathon.

---

**GigShield AI** - Protecting gig workers across India 🇮🇳
```
##The Frist market crash

## Adversarial Defense & Anti-Spoofing Strategy

The first market crash changed the way we think about this product. In that scenario, a coordinated group of delivery workers used GPS-spoofing tools to fake their presence inside a severe weather zone and trigger false parametric payouts at scale. That means location alone can no longer be treated as truth. Our defense strategy is to move from single-point verification to behavior-based verification, where a claim is judged through a wider pattern of signals instead of one GPS reading.

### 1. The Differentiation

Our AI/ML architecture would distinguish a genuinely stranded worker from a spoofing actor by looking for consistency between location, movement, platform activity, device behavior, and surrounding event data. A real stranded worker usually leaves behind a believable operational story: they were active before the disruption, their movement pattern made sense for a delivery route, the weather event matches the timing of the interruption, and their digital behavior remains natural even if the network is unstable. A spoofing actor may be able to fake a coordinate, but it is much harder to fake a full chain of believable context.

Instead of asking, "Is this worker inside the red zone?", the model asks a stronger question: "Does this claim look like the behavior of a real worker who was genuinely affected by this event?" That shift is the core of our anti-spoofing design.

We would score each claim on a trust spectrum using multiple layers:

- Event authenticity: did a verified weather or emergency event actually occur in that place and time?
- Activity continuity: was the worker genuinely active before the disruption and then interrupted in a realistic way?
- Movement realism: does the route history look like normal delivery movement or like synthetic jumps and impossible travel?
- Device integrity: are there signs of mock-location tools, rooted devices, emulator patterns, or sudden device-environment changes?
- Network consistency: do IP region, carrier behavior, and signal-loss patterns roughly match the claimed situation?
- Group anomaly detection: is this claim part of a suspicious cluster of very similar claims from the same area, channel, or time window?

In simple terms, a real worker tends to produce messy but believable signals. A fraud ring tends to produce clean, repeated, and coordinated manipulation patterns.

### 2. The Data

To detect a coordinated fraud ring, our system would analyze more than raw latitude and longitude. The goal is to combine environmental, behavioral, device, and network evidence into one fraud-risk view.

Important data points would include:

- Route history over time, not just a final pinned point
- Speed, acceleration, stoppage pattern, and direction changes
- Timestamp consistency between claimed disruption, recent delivery activity, and app usage
- Delivery-platform signals such as order acceptance, pickup attempts, cancellations, and session activity
- Device telemetry such as mock-location detection, developer mode indicators, rooted-device signals, emulator signatures, sensor availability, and sudden GPS-source switching
- Network clues such as IP geolocation, carrier consistency, SIM change patterns, and unusual VPN or proxy usage
- Weather severity data mapped to time and micro-location, including whether nearby workers show similar but not identical disruption patterns
- Claim frequency by worker, device, phone number, payout account, and locality
- Shared-fingerprint signals that may reveal collusion, such as many claims tied to the same device family, bank destination, IP cluster, or repeated timing pattern
- Historical reliability score for each worker based on prior genuine activity and prior flagged behavior

This matters because fraud at this level is not usually a single fake claim. It is a coordinated pattern. A ring may use different identities, but clusters often still appear through repeated devices, similar timing, identical movement profiles, common payout paths, or synchronized filing behavior. Our system is designed to spot both the suspicious individual claim and the wider group signature behind it.

### 3. The UX Balance

The biggest risk in anti-fraud design is overcorrecting and punishing honest workers, especially during real storms when networks are unstable and location quality gets worse. Our workflow therefore avoids turning every suspicious signal into an automatic rejection.

We use a three-lane claim decision flow:

- Low-risk claims: auto-approve quickly when signals are consistent
- Medium-risk claims: place into a soft-review state and request lightweight confirmation
- High-risk claims: hold payout temporarily and escalate for deeper fraud review

For flagged claims, the user experience should stay fair and respectful. A worker should not be treated like a fraudster just because their signal dropped in bad weather. If a claim is flagged, the system should explain that additional verification is needed due to inconsistent telemetry, not accuse the worker of misconduct. We would ask for the least burdensome proof first, such as recent order timeline confirmation, passive device re-check, or a short in-app verification step once connectivity stabilizes.

We would also build in a "benefit of doubt" layer for genuine edge cases. For example, if severe weather is confirmed, the worker has a strong history, and only one signal is missing because of a temporary network drop, the claim should move into assisted verification rather than hard denial. The platform should slow down suspicious payouts, not block honest workers from support when they need it most.

### First Market Crash Response Summary

The lesson from the first market crash is clear: parametric insurance cannot rely on GPS alone. Our response is a multi-signal trust architecture that looks at whether a claim is believable as a real-world event, not just whether a device reported a location. By combining behavior analytics, device trust checks, network context, event validation, and fraud-ring clustering, Gig-Shield becomes much harder to exploit through mass spoofing. At the same time, the workflow remains worker-sensitive by using soft review and progressive verification instead of blunt rejection. That gives us a system that is both more resilient against organized fraud and more humane toward honest gig workers.

