import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getTelegramUser } from '../lib/telegram';
import { ShoppingBag, Gift, Star, ChevronRight } from 'lucide-react';
import { useCreateReferral, useUserReferrals, useBanners } from '../lib/supabase/hooks';
import { HomeBannerSlider } from '../components/HomeBannerSlider';

export const Home = () => {
  const navigate = useNavigate();
  const { language, setLanguage, setTelegramUserId } = useAppStore();
  const [showReferral, setShowReferral] = useState(false);

  const createReferral = useCreateReferral();
  const user = getTelegramUser();
  const { data: userReferrals = [] } = useUserReferrals(user?.id || 0);
  const { data: banners = [] } = useBanners(true);

  useEffect(() => {
    if (user) {
      setTelegramUserId(user.id);
      const langCode = user.language_code;
      if (langCode === 'uz' || langCode === 'ru') {
        setLanguage(langCode);
      }

      if (userReferrals.length === 0) {
        createReferral.mutate(user.id);
      }
    }
  }, [user?.id, userReferrals.length]);

  const handleLanguageSelect = (lang: 'ru' | 'uz') => {
    setLanguage(lang);
    navigate('/catalog');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {banners.length > 0 && (
        <div className="flex-shrink-0">
          <HomeBannerSlider
            banners={banners}
            language={language}
            onNavigate={(url) => navigate(url && url.startsWith('/') ? url : '/catalog')}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-5">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">StyleTech Shop</h1>
            <p className="text-blue-300/80 text-sm">
              {language === 'ru' ? 'Выберите язык интерфейса' : 'Interfeys tilini tanlang'}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleLanguageSelect('ru')}
              className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 active:scale-[0.98] backdrop-blur-sm border border-white/10 text-white py-4 px-5 rounded-2xl font-semibold text-base transition-all"
            >
              <span className="text-2xl">🇷🇺</span>
              <div className="text-left flex-1">
                <p className="font-semibold">Русский</p>
                <p className="text-xs text-blue-300/70 font-normal">Russian</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>

            <button
              onClick={() => handleLanguageSelect('uz')}
              className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 active:scale-[0.98] backdrop-blur-sm border border-white/10 text-white py-4 px-5 rounded-2xl font-semibold text-base transition-all"
            >
              <span className="text-2xl">🇺🇿</span>
              <div className="text-left flex-1">
                <p className="font-semibold">O'zbekcha</p>
                <p className="text-xs text-blue-300/70 font-normal">Uzbek</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {user && userReferrals.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowReferral(!showReferral)}
                className="w-full bg-white/8 hover:bg-white/12 backdrop-blur-sm text-white/80 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-white/8"
              >
                <Gift className="w-4 h-4" />
                <span>
                  {language === 'ru' ? 'Пригласить друга' : "Do'stni taklif qilish"}
                </span>
              </button>

              {showReferral && (
                <div className="mt-3 bg-white rounded-2xl p-4 shadow-xl">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                    {language === 'ru' ? 'Ваша реферальная ссылка' : 'Referal havolangiz'}
                  </h3>
                  <div className="bg-gray-100 rounded-xl p-3 mb-2">
                    <code className="text-xs text-gray-800 break-all">
                      {userReferrals[0].referral_code}
                    </code>
                  </div>
                  <p className="text-xs text-gray-600">
                    {language === 'ru'
                      ? `+${userReferrals[0].bonus_amount.toLocaleString()} сум за каждого друга!`
                      : `Har bir do'st uchun +${userReferrals[0].bonus_amount.toLocaleString()} so'm!`}
                  </p>
                  {userReferrals[0].is_redeemed && (
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>{language === 'ru' ? 'Использован!' : 'Ishlatildi!'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-blue-400/50 text-xs mt-10">
            {language === 'ru' ? 'Telegram Mini App · Узбекистан' : "Telegram Mini App · O'zbekiston"}
          </p>
        </div>
      </div>
    </div>
  );
};
