import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Crown, CreditCard, Smartphone, ShieldCheck, ArrowRight, Copy, CheckCircle2, Upload, Image as ImageIcon, AlertCircle, ChevronLeft } from 'lucide-react';
import { UserProfile } from '../types';
import { GoogleGenAI } from "@google/genai";

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onSubscribe: (plan: 'monthly' | 'yearly', utr: string) => Promise<void>;
}

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: '₹29',
    duration: 'per month',
    features: ['All Premium Movies', 'Full HD Quality', 'Ad-free Experience', '2 Devices Support'],
    color: 'from-blue-600 to-blue-400'
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    price: '₹199',
    duration: 'per year',
    features: ['All Premium Movies', '4K Ultra HD Quality', 'Ad-free Experience', '4 Devices Support', 'Save 40% Yearly'],
    color: 'from-yellow-600 to-yellow-400',
    popular: true
  }
];

export default function MembershipModal({ isOpen, onClose, userProfile, onSubscribe }: MembershipModalProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<'monthly' | 'yearly' | null>(null);
  const [step, setStep] = React.useState<'plans' | 'payment' | 'verifying' | 'success' | 'error'>('plans');
  const [utr, setUtr] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const UPI_ID = "omparkashkumar503-1@okicici"; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const verifyScreenshot = async (base64Data: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Analyze this UPI payment screenshot. 
      1. Is it a successful payment?
      2. Is the recipient UPI ID "${UPI_ID}"?
      3. Is the amount ₹${selectedPlan === 'monthly' ? '29' : '199'}?
      
      Respond ONLY with a JSON object: 
      {
        "verified": boolean,
        "amount": number,
        "recipient": string,
        "status": "SUCCESS" | "FAILED" | "PENDING",
        "reason": "string explaining if not verified"
      }`;

      const result = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data.split(',')[1]
                }
              }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const analysis = JSON.parse(result.text || '{}');
      return analysis;
    } catch (err) {
      console.error("AI Verification Error:", err);
      return { verified: false, reason: "AI verification failed. Please try again or enter UTR manually." };
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    
    setStep('verifying');
    setIsAnalyzing(true);

    let isVerified = false;
    
    if (screenshot) {
      const analysis = await verifyScreenshot(screenshot);
      if (analysis.verified) {
        isVerified = true;
      } else {
        setErrorMsg(analysis.reason || "Payment could not be verified from the screenshot.");
        setStep('error');
        setIsAnalyzing(false);
        return;
      }
    } else if (utr.length >= 10) {
      // Fallback to manual UTR if no screenshot
      isVerified = true;
    } else {
      setErrorMsg("Please upload a screenshot or enter a valid UTR number.");
      setStep('error');
      setIsAnalyzing(false);
      return;
    }

    if (isVerified) {
      await onSubscribe(selectedPlan, utr || "AI_VERIFIED");
      setStep('success');
      setTimeout(() => {
        onClose();
        setStep('plans');
        setSelectedPlan(null);
        setUtr('');
        setScreenshot(null);
      }, 3000);
    }
    
    setIsAnalyzing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-[#121212] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-2">
            {step === 'payment' && (
              <button 
                onClick={() => setStep('plans')}
                className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors mr-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
              {step === 'payment' ? 'Payment Details' : 'Premium Subscription'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all border border-white/10"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Close</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto scrollbar-hide">
          {step === 'plans' && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-yellow-500/10 rounded-2xl mb-2">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">Upgrade to Premium</h2>
                <p className="text-gray-400 text-sm">Get unlimited access to all movies, series and sports.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {PLANS.map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as any)}
                    className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id 
                        ? 'border-yellow-500 bg-yellow-500/5' 
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        Most Popular
                      </span>
                    )}
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-white uppercase tracking-wider">{plan.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white">{plan.price}</span>
                            <span className="text-xs text-gray-500">{plan.duration}</span>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedPlan === plan.id ? 'border-yellow-500 bg-yellow-500' : 'border-white/20'
                        }`}>
                          {selectedPlan === plan.id && <Check className="w-4 h-4 text-black" />}
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((f, i) => (
                          <li key={`feature-${plan.id}-${i}`} className="flex items-center gap-2 text-[11px] text-gray-400">
                            <Check className="w-3 h-3 text-green-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  disabled={!selectedPlan}
                  onClick={() => setStep('payment')}
                  className="w-full py-4 bg-yellow-500 text-black rounded-xl font-black uppercase tracking-widest hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
                >
                  Continue to Payment
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-3 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Cancel and Go Back
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Complete Payment</h2>
                <p className="text-gray-400 text-sm">Pay using any UPI app (PhonePe, GPay, Paytm)</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-48 h-48 bg-white p-2 rounded-xl">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${UPI_ID}%26pn=OPRK%20Plus%26am=${selectedPlan === 'monthly' ? '29' : '199'}%26cu=INR`}
                      alt="UPI QR Code"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">UPI ID</p>
                    <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
                      <code className="text-yellow-500 font-bold">{UPI_ID}</code>
                      <button onClick={() => {
                        navigator.clipboard.writeText(UPI_ID);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }} className="text-gray-400 hover:text-white transition-colors">
                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Upload Payment Screenshot (Recommended)</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all ${
                        screenshot ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-black/40 group-hover:border-white/20'
                      }`}>
                        {screenshot ? (
                          <>
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                              <img src={screenshot} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] text-green-500 font-bold uppercase">Screenshot Attached</span>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-white/5 rounded-full">
                              <Upload className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Click or Drag to Upload</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/5"></span>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                      <span className="bg-[#121212] px-2 text-gray-600">OR</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enter Transaction ID (UTR)</label>
                    <input 
                      type="text"
                      placeholder="12-digit UTR Number"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('plans')}
                  className="flex-1 py-4 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                >
                  Back
                </button>
                <button 
                  disabled={!screenshot && utr.length < 10}
                  onClick={handleSubmit}
                  className="flex-[2] py-4 bg-yellow-500 text-black rounded-xl font-black uppercase tracking-widest hover:bg-yellow-600 transition-all disabled:opacity-50"
                >
                  {screenshot ? 'Verify & Subscribe' : 'Submit Payment'}
                </button>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-yellow-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  {isAnalyzing ? 'Analyzing Screenshot...' : 'Verifying Payment...'}
                </h2>
                <p className="text-gray-400 text-sm max-w-xs">
                  Our AI is detecting your payment details. This will only take a moment.
                </p>
              </div>
              <button 
                onClick={() => setStep('payment')}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
              >
                Cancel Verification
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-black" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Payment Successful!</h2>
                <p className="text-gray-400 text-sm max-w-xs">
                  Welcome to OPRK+ Premium. Your account has been activated instantly.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Verification Failed</h2>
                <p className="text-red-400 text-sm max-w-xs">{errorMsg}</p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                  onClick={() => setStep('payment')}
                  className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => setStep('plans')}
                  className="w-full py-3 bg-white/5 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Change Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
