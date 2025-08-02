import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'lo' | 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

  const translations = {
    en: {
      // Reset functionality
      resetData: 'Reset Data',
      resetDataConfirm: 'Reset All Data?',
      resetDataWarning: 'This action will permanently delete all trading history, transactions, and reset fund data to default values. This action cannot be undone.',
      resetSubUserWarning: 'This action will permanently delete all data for sub-account "{name}". This action cannot be undone.',
      dataResetSuccess: 'Data Reset Successfully',
      allDataHasBeenReset: 'All data has been reset to default values',
      subUserDataReset: 'Sub-account {name} data has been reset',
      failedToResetData: 'Failed to reset data. Please try again.',
      
      // Theme
      toggleTheme: 'Toggle theme',
      
      // Existing translations...
    },
    th: {
      // Reset functionality
      resetData: 'รีเซ็ตข้อมูล',
      resetDataConfirm: 'รีเซ็ตข้อมูลทั้งหมด?',
      resetDataWarning: 'การดำเนินการนี้จะลบประวัติการเทรด ธุรกรรม และรีเซ็ตข้อมูลกองทุนเป็นค่าเริ่มต้นอย่างถาวร การดำเนินการนี้ไม่สามารถยกเลิกได้',
      resetSubUserWarning: 'การดำเนินการนี้จะลบข้อมูลทั้งหมดของบัญชีย่อย "{name}" อย่างถาวร การดำเนินการนี้ไม่สามารถยกเลิกได้',
      dataResetSuccess: 'รีเซ็ตข้อมูลสำเร็จ',
      allDataHasBeenReset: 'ข้อมูลทั้งหมดได้รับการรีเซ็ตเป็นค่าเริ่มต้นแล้ว',
      subUserDataReset: 'ข้อมูลบัญชีย่อย {name} ได้รับการรีเซ็ตแล้ว',
      failedToResetData: 'ไม่สามารถรีเซ็ตข้อมูลได้ กรุณาลองอีกครั้ง',
      
      // Theme
      toggleTheme: 'สลับธีม',
      
      // Existing translations...
    },
    lo: {
      // Reset functionality
      resetData: 'ຣີເຊັດຂໍ້ມູນ',
      resetDataConfirm: 'ຣີເຊັດຂໍ້ມູນທັງໝົດ?',
      resetDataWarning: 'ການກະທຳນີ້ຈະລຶບປະຫວັດການເທດ, ທຸລະກຳ, ແລະ ຣີເຊັດຂໍ້ມູນກອງທຶນເປັນຄ່າເລີ່ມຕົ້ນຢ່າງຖາວອນ. ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.',
      resetSubUserWarning: 'ການກະທຳນີ້ຈະລຶບຂໍ້ມູນທັງໝົດຂອງບັນຊີຍ່ອຍ "{name}" ຢ່າງຖາວອນ. ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.',
      dataResetSuccess: 'ຣີເຊັດຂໍ້ມູນສຳເລັດ',
      allDataHasBeenReset: 'ຂໍ້ມູນທັງໝົດໄດ້ຮັບການຣີເຊັດເປັນຄ່າເລີ່ມຕົ້ນແລ້ວ',
      subUserDataReset: 'ຂໍ້ມູນບັນຊີຍ່ອຍ {name} ໄດ້ຮັບການຣີເຊັດແລ້ວ',
      failedToResetData: 'ບໍ່ສາມາດຣີເຊັດຂໍ້ມູນໄດ້. ກະລຸນາລອງອີກຄັ້ງ.',
      
      // Theme
      toggleTheme: 'ສະຫຼັບທີມ',
      
      // Existing translations...
    },
  };

  // Update translations object structure
  const updatedTranslations = {
  th: {
    // Auth page
    'welcome': 'ยินดีต้อนรับ',
    'signin': 'เข้าสู่ระบบ',
    'signup': 'สมัครสมาชิก',
    'email': 'อีเมล',
    'password': 'รหัสผ่าน',
    'fullName': 'ชื่อเต็ม',
    'traderName': 'ชื่อผู้ค้า',
    'createAccount': 'สร้างบัญชี',
    'signInButton': 'เข้าสู่ระบบ',
    'signingIn': 'กำลังเข้าสู่ระบบ...',
    'creatingAccount': 'กำลังสร้างบัญชี...',
    'checkEmail': 'กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี',
    'error': 'ข้อผิดพลาด',
    'success': 'สำเร็จ!',
    'tradingSystem': 'ระบบการค้าแบบมืออาชีพ',
    'signInToAccount': 'เข้าสู่ระบบบัญชีของคุณ หรือ สร้างบัญชีใหม่',
    
    // Dashboard
    'dashboard': 'หน้าหลัก',
    'totalCapital': 'ทุนทั้งหมด',
    'activeFund': 'เงินทุนการค้า',
    'reserveFund': 'เงินทุนสำรอง',
    'profitFund': 'เงินกำไร',
    'tradingCapital': 'ทุนการค้า',
    'safetyCapital': 'ทุนความปลอดภัย',
    'earnedProfits': 'กำไรที่ได้รับ',
    'signOut': 'ออกจากระบบ',
    
    // Trading modes
    'diamondMode': 'โหมดเพชร',
    'goldMode': 'โหมดทอง',
    
    // Trade recorder
    'recordTradeResult': 'บันทึกผลการค้า',
    'endOfWeekBalance': 'ยอดเงินสิ้นสัปดาห์',
    'tradeDate': 'วันที่การค้า',
    'activeFundBalance': 'ยอดเงินทุนการค้า',
    'record': 'บันทึก',
    'recording': 'กำลังบันทึก...',
    
    // Lot calculator
    'lotCalculator': 'เครื่องคิดไลท์ล็อต',
    'accountBalance': 'ยอดเงินบัญชี',
    'riskPercentage': 'เปอร์เซ็นต์ความเสี่ยง',
    'stopLossPips': 'จุดหยุดขาดทุน (pips)',
    'calculate': 'คำนวณ',
    'recommendedLotSize': 'ขนาดล็อตที่แนะนำ',
    'riskAmount': 'จำนวนเงินที่เสี่ยง',
    'positionValue': 'มูลค่าโพซิชัน',
    
    // Fund management
    'fundManagement': 'การจัดการกองทุน',
    'deposit': 'ฝากเงิน',
    'withdraw': 'ถอนเงิน',
    'transfer': 'โอนเงิน',
    'amountField': 'จำนวนเงิน',
    'from': 'จาก',
    'to': 'ไป',
    'depositFunds': 'ฝากเงินทุน',
    'withdrawFunds': 'ถอนเงินทุน',
    'transferFunds': 'โอนเงินทุน',
    'processing': 'กำลังประมวลผล...',
    
    // Trading calendar
    'tradingCalendar': 'ปฏิทินการค้า',
    
    // Trading history
    'tradingHistory': 'ประวัติการค้า',
    'date': 'วันที่',
    'type': 'ประเภท',
    'amount': 'จำนวน',
    'balance': 'ยอดเงิน',
    'pnl': 'กำไร/ขาดทุน',
    'noHistory': 'ไม่มีประวัติการค้า',
    
    // Capital growth chart
    'capitalGrowthChart': 'แผนภูมิการเติบโตของทุน',
    'growth': 'การเติบโต',
    
    // Common
    'loading': 'กำลังโหลด...',
    'language': 'ภาษา',
    'lao': 'ลาว',
    'english': 'อังกฤษ',
    'thai': 'ไทย',
  },
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
    'thai': 'ໄທ',
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
    'thai': 'Thai',
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