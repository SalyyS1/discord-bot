'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  ArrowLeft, 
  ArrowRight,
  Check,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Shield,
  Key,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FormData {
  name: string;
  discordToken: string;
  discordClientId: string;
  discordClientSecret: string;
}

const STEPS = [
  { id: 1, title: 'Bot Info', icon: Bot },
  { id: 2, title: 'Credentials', icon: Key },
  { id: 3, title: 'Review', icon: CheckCircle2 },
];

export default function NewBotPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    discordToken: '',
    discordClientId: '',
    discordClientSecret: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateStep1 = () => {
    const newErrors: Partial<FormData> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Bot name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Bot name must be less than 100 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<FormData> = {};
    if (!formData.discordToken.trim()) {
      newErrors.discordToken = 'Bot token is required';
    } else if (formData.discordToken.length < 50) {
      newErrors.discordToken = 'Invalid token format';
    }
    if (!formData.discordClientId.trim()) {
      newErrors.discordClientId = 'Client ID is required';
    } else if (!/^\d{17,19}$/.test(formData.discordClientId)) {
      newErrors.discordClientId = 'Invalid Client ID format (should be 17-19 digits)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Bot created successfully!');
        router.push('/dashboard/bots');
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to create bot');
      }
    } catch {
      toast.error('Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/bots" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bots
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-400" />
          Create New Bot
        </h1>
        <p className="text-gray-400 mt-1">
          Set up your own custom Discord bot in minutes
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, index) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          
          return (
            <div key={s.id} className="flex items-center">
              <div className={`
                flex items-center gap-3 px-4 py-2 rounded-xl transition-all
                ${isActive ? 'bg-indigo-500/20 text-indigo-400' : ''}
                ${isCompleted ? 'text-green-400' : ''}
                ${!isActive && !isCompleted ? 'text-gray-500' : ''}
              `}>
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${isActive ? 'bg-indigo-500' : ''}
                  ${isCompleted ? 'bg-green-500' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-700' : ''}
                `}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="font-medium hidden sm:block">{s.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${step > s.id ? 'bg-green-500' : 'bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="text-white">Bot Information</CardTitle>
              <CardDescription>Give your bot a name to identify it in the dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Bot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                <p className="text-xs text-gray-500">
                  This is just a label for your reference, not the actual Discord bot name.
                </p>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="text-white">Discord Credentials</CardTitle>
              <CardDescription>Enter your bot token and client ID from the Discord Developer Portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  Never share your bot token with anyone. It will be encrypted before storage.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="discordClientId">Client ID</Label>
                <Input
                  id="discordClientId"
                  placeholder="1234567890123456789"
                  value={formData.discordClientId}
                  onChange={(e) => setFormData({ ...formData, discordClientId: e.target.value })}
                  className={errors.discordClientId ? 'border-red-500' : ''}
                />
                {errors.discordClientId && <p className="text-sm text-red-400">{errors.discordClientId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordToken">Bot Token</Label>
                <div className="relative">
                  <Input
                    id="discordToken"
                    type={showToken ? 'text' : 'password'}
                    placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4.XXXXXX.XXXXXXXXXXXXXXXXXXXXXXX"
                    value={formData.discordToken}
                    onChange={(e) => setFormData({ ...formData, discordToken: e.target.value })}
                    className={`pr-10 ${errors.discordToken ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.discordToken && <p className="text-sm text-red-400">{errors.discordToken}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordClientSecret">Client Secret (Optional)</Label>
                <Input
                  id="discordClientSecret"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={formData.discordClientSecret}
                  onChange={(e) => setFormData({ ...formData, discordClientSecret: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Only needed for OAuth2 features.
                </p>
              </div>

              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Open Discord Developer Portal
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle className="text-white">Review & Create</CardTitle>
              <CardDescription>Confirm your bot details before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Bot Name</span>
                  <span className="text-white font-medium">{formData.name}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Client ID</span>
                  <span className="text-white font-mono text-sm">{formData.discordClientId}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Token</span>
                  <span className="text-white font-mono text-sm">
                    {formData.discordToken.substring(0, 20)}...
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Plan</span>
                  <span className="text-white">Free (1 server)</span>
                </div>
              </div>

              <Alert className="bg-green-500/10 border-green-500/30">
                <Shield className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  Your credentials will be encrypted with AES-256 before storage.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        )}

        {/* Navigation */}
        <div className="p-6 pt-0 flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Create Bot
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
