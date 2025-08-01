import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'lo' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  lo: {
    // Auth page
    'welcome': 'ຍິນດີຕ້ອນຮັບ',
    'signin': 'ເຂົ້າສູ່ລະບົບ',
    'signup': 'ສະໝັກສະມາຊິກ',
    'email': 'ອີເມລ',
    'password': 'ລະຫັດຜ່ານ',
    'fullName': 'ຊື່ເຕັມ',
    'traderName': 'ຊື່ຜູ້ຄ້າ',
    'createAccount': 'ສ້າງບັນຊີ',
    'signInButton': 'ເຂົ້າສູ່ລະບົບ',
    'signingIn': 'ກຳລັງເຂົ້າສູ່ລະບົບ...',
    'creatingAccount': 'ກຳລັງສ້າງບັນຊີ...',
    'checkEmail': 'ກະລຸນາກວດສອບອີເມລຂອງທ່ານເພື່ອຢືນຢັນບັນຊີ',
    'error': 'ຜິດພາດ',
    'success': 'ສຳເລັດ!',
    'tradingSystem': 'ລະບົບການຄ້າມືອາຊີບ',
    'signInToAccount': 'ເຂົ້າສູ່ລະບົບບັນຊີຂອງທ່ານ ຫຼື ສ້າງບັນຊີໃໝ່',
    
    // Dashboard
    'dashboard': 'ໜ້າຫຼັກ',
    'totalCapital': 'ຊັບທັງໝົດ',
    'activeFund': 'ເງິນທຶນການຄ້າ',
    'reserveFund': 'ເງິນທຶນສະສົມ',
    'profitFund': 'ເງິນກຳໄລ',
    'tradingCapital': 'ທຶນການຄ້າ',
    'safetyCapital': 'ທຶນຄວາມປອດໄພ',
    'earnedProfits': 'ກຳໄລທີ່ໄດ້ຮັບ',
    'signOut': 'ອອກຈາກລະບົບ',
    
    // Trading modes
    'diamondMode': 'ໂໝດເພັດ',
    'goldMode': 'ໂໝດຄຳ',
    
    // Trade recorder
    'recordTradeResult': 'ບັນທຶກຜົນການຄ້າ',
    'endOfWeekBalance': 'ຍອດເງິນທີ່ຈົບອາທິດ',
    'tradeDate': 'ວັນທີການຄ້າ',
    'activeFundBalance': 'ຍອດເງິນທຶນການຄ້າ',
    'record': 'ບັນທຶກ',
    'recording': 'ກຳລັງບັນທຶກ...',
    
    // Lot calculator
    'lotCalculator': 'ເຄື່ອງຄິດໄລ່ລັອດ',
    'accountBalance': 'ຍອດເງິນບັນຊີ',
    'riskPercentage': 'ເປີເຊັນຄວາມສ່ຽງ',
    'stopLossPips': 'ຈຸດຢຸດຂາດທຶນ (pips)',
    'calculate': 'ຄິດໄລ່',
    'recommendedLotSize': 'ຂະໜາດລັອດທີ່ແນະນຳ',
    'riskAmount': 'ຈຳນວນເງິນທີ່ຈະສ່ຽງ',
    'positionValue': 'ມູນຄ່າໂພຊິຊັນ',
    
    // Fund management
    'fundManagement': 'ການຈັດການກອງທຶນ',
    'deposit': 'ຝາກເງິນ',
    'withdraw': 'ຖອນເງິນ',
    'transfer': 'ໂອນເງິນ',
    'amountField': 'ຈຳນວນເງິນ',
    'from': 'ຈາກ',
    'to': 'ໄປ',
    'depositFunds': 'ຝາກເງິນທຶນ',
    'withdrawFunds': 'ຖອນເງິນທຶນ',
    'transferFunds': 'ໂອນເງິນທຶນ',
    'processing': 'ກຳລັງປະມວນຜົນ...',
    
    // Trading calendar
    'tradingCalendar': 'ປະຕິທິນການຄ້າ',
    
    // Trading history
    'tradingHistory': 'ປະຫວັດການຄ້າ',
    'date': 'ວັນທີ',
    'type': 'ປະເພດ',
    'amount': 'ຈຳນວນ',
    'balance': 'ຍອດເງິນ',
    'pnl': 'ກຳໄລ/ຂາດທຶນ',
    'noHistory': 'ບໍ່ມີປະຫວັດການຄ້າ',
    
    // Capital growth chart
    'capitalGrowthChart': 'ແຜນພູມການເຕີບໂຕຂອງທຶນ',
    'growth': 'ການເຕີບໂຕ',
    
    // Common
    'loading': 'ກຳລັງໂຫຼດ...',
    'language': 'ພາສາ',
    'lao': 'ລາວ',
    'english': 'ອັງກິດ',
  },
  en: {
    // Auth page
    'welcome': 'Welcome',
    'signin': 'Sign In',
    'signup': 'Sign Up',
    'email': 'Email',
    'password': 'Password',
    'fullName': 'Full Name',
    'traderName': 'Trader Name',
    'createAccount': 'Create Account',
    'signInButton': 'Sign In',
    'signingIn': 'Signing in...',
    'creatingAccount': 'Creating account...',
    'checkEmail': 'Please check your email to confirm your account',
    'error': 'Error',
    'success': 'Success!',
    'tradingSystem': 'Professional Trading Management System',
    'signInToAccount': 'Sign in to your account or create a new one',
    
    // Dashboard
    'dashboard': 'Dashboard',
    'totalCapital': 'Total Capital',
    'activeFund': 'Active Fund',
    'reserveFund': 'Reserve Fund',
    'profitFund': 'Profit Fund',
    'tradingCapital': 'Trading capital',
    'safetyCapital': 'Safety capital',
    'earnedProfits': 'Earned profits',
    'signOut': 'Sign Out',
    
    // Trading modes
    'diamondMode': 'Diamond Mode',
    'goldMode': 'Gold Mode',
    
    // Trade recorder
    'recordTradeResult': 'Record Trade Result',
    'endOfWeekBalance': 'End of Week Balance',
    'tradeDate': 'Trade Date',
    'activeFundBalance': 'Active Fund Balance',
    'record': 'Record',
    'recording': 'Recording...',
    
    // Lot calculator
    'lotCalculator': 'Lot Calculator',
    'accountBalance': 'Account Balance',
    'riskPercentage': 'Risk Percentage',
    'stopLossPips': 'Stop Loss Pips',
    'calculate': 'Calculate',
    'recommendedLotSize': 'Recommended Lot Size',
    'riskAmount': 'Risk Amount',
    'positionValue': 'Position Value',
    
    // Fund management
    'fundManagement': 'Fund Management',
    'deposit': 'Deposit',
    'withdraw': 'Withdraw',
    'transfer': 'Transfer',
    'amountField': 'Amount',
    'from': 'From',
    'to': 'To',
    'depositFunds': 'Deposit Funds',
    'withdrawFunds': 'Withdraw Funds',
    'transferFunds': 'Transfer Funds',
    'processing': 'Processing...',
    
    // Trading calendar
    'tradingCalendar': 'Trading Calendar',
    
    // Trading history
    'tradingHistory': 'Trading History',
    'date': 'Date',
    'type': 'Type',
    'amount': 'Amount',
    'balance': 'Balance',
    'pnl': 'P&L',
    'noHistory': 'No trading history available',
    
    // Capital growth chart
    'capitalGrowthChart': 'Capital Growth Chart',
    'growth': 'Growth',
    
    // Common
    'loading': 'Loading...',
    'language': 'Language',
    'lao': 'Lao',
    'english': 'English',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'lo';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['lo']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};