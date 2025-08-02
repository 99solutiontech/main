import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'lo' | 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const updatedTranslations = {
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
    
    // Fund management
    'fundManagement': 'Fund Management',
    'deposit': 'Deposit',
    'withdraw': 'Withdraw',
    'transfer': 'Transfer',
    'amount': 'Amount (USD)',
    'from': 'From',
    'to': 'To',
    'processing': 'Processing...',
    'willBeSplit': 'Will be split',
    'toActiveFund': 'to Active Fund',
    'toReserveFund': 'to Reserve Fund',
    'transferBetweenAccounts': 'Transfer Between Accounts',
    'mainAccount': 'Main Account',
    'subAccount': 'Sub Account',
    'fromFund': 'From Fund',
    'toFund': 'To Fund',
    
    // Reset functionality
    'resetData': 'Reset Data',
    'resetDataConfirm': 'Reset All Data?',
    'resetDataWarning': 'This action will permanently delete all trading history, transactions, and reset fund data to default values. This action cannot be undone.',
    'resetSubUserWarning': 'This action will permanently delete all data for sub-account "{name}". This action cannot be undone.',
    'dataResetSuccess': 'Data Reset Successfully',
    'allDataHasBeenReset': 'All data has been reset to default values',
    'subUserDataReset': 'Sub-account {name} data has been reset',
    'failedToResetData': 'Failed to reset data. Please try again.',
    
    // Common
    'loading': 'Loading...',
    'language': 'Language',
    'lao': 'Lao',
    'english': 'English',
    'thai': 'Thai',
    'toggleTheme': 'Toggle theme',
    
    // Additional translations
    'capitalGrowth': 'Capital Growth',
    'tradingHistory': 'Trading History',
    'fundTransactionHistory': 'Fund Transaction History',
    'recordTradeResult': 'Record Trade Result',
    'lotCalculator': 'Lot Calculator',
    'initializeFund': 'Initialize Fund',
    'initialCapital': 'Initial Capital (USD)',
    'setUpInitialCapital': 'Set up your initial capital for',
    'endOfWeekActiveFundBalance': 'End of Week Active Fund Balance',
    'recordWeeklyResult': 'Record Weekly Result',
    'initialize': 'Initialize',
    'initialCapitalSet': 'Initial capital set to',
    'depositedAmount': 'Deposited',
    'settingsUpdate': 'settings_update',
    'updatedProfitDistribution': 'Updated profit distribution',
    'monthlyGrowth': 'Monthly Growth',
  },
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
    
    // Fund management
    'fundManagement': 'การจัดการกองทุน',
    'deposit': 'ฝากเงิน',
    'withdraw': 'ถอนเงิน',
    'transfer': 'โอนเงิน',
    'amount': 'จำนวนเงิน (USD)',
    'from': 'จาก',
    'to': 'ไป',
    'processing': 'กำลังประมวลผล...',
    'willBeSplit': 'จะถูกแบ่ง',
    'toActiveFund': 'ไปยังกองทุนการค้า',
    'toReserveFund': 'ไปยังกองทุนสำรอง',
    'transferBetweenAccounts': 'โอนระหว่างบัญชี',
    'mainAccount': 'บัญชีหลัก',
    'subAccount': 'บัญชีย่อย',
    'fromFund': 'จากกองทุน',
    'toFund': 'ไปยังกองทุน',
    
    // Additional translations
    'capitalGrowth': 'การเติบโตของทุน',
    'tradingHistory': 'ประวัติการเทรด',
    'fundTransactionHistory': 'ประวัติธุรกรรมกองทุน',
    'recordTradeResult': 'บันทึกผลการเทรด',
    'lotCalculator': 'คำนวณล็อต',
    'initializeFund': 'เริ่มต้นกองทุน',
    'initialCapital': 'ทุนเริ่มต้น (USD)',
    'setUpInitialCapital': 'ตั้งค่าทุนเริ่มต้นของคุณสำหรับโหมด',
    'endOfWeekActiveFundBalance': 'ยอดกองทุนการค้าสิ้นสัปดาห์',
    'recordWeeklyResult': 'บันทึกผลรายสัปดาห์',
    'initialize': 'เริ่มต้น',
    'initialCapitalSet': 'ตั้งทุนเริ่มต้นเป็น',
    'depositedAmount': 'ฝากเงิน',
    'settingsUpdate': 'อัปเดตการตั้งค่า',
    'updatedProfitDistribution': 'อัปเดตการกระจายกำไร',
    'monthlyGrowth': 'การเติบโตรายเดือน',
    
    // Reset functionality
    'resetData': 'รีเซ็ตข้อมูล',
    'resetDataConfirm': 'รีเซ็ตข้อมูลทั้งหมด?',
    'resetDataWarning': 'การดำเนินการนี้จะลบประวัติการเทรด ธุรกรรม และรีเซ็ตข้อมูลกองทุนเป็นค่าเริ่มต้นอย่างถาวร การดำเนินการนี้ไม่สามารถยกเลิกได้',
    'resetSubUserWarning': 'การดำเนินการนี้จะลบข้อมูลทั้งหมดของบัญชีย่อย "{name}" อย่างถาวร การดำเนินการนี้ไม่สามารถยกเลิกได้',
    'dataResetSuccess': 'รีเซ็ตข้อมูลสำเร็จ',
    'allDataHasBeenReset': 'ข้อมูลทั้งหมดได้รับการรีเซ็ตเป็นค่าเริ่มต้นแล้ว',
    'subUserDataReset': 'ข้อมูลบัญชีย่อย {name} ได้รับการรีเซ็ตแล้ว',
    'failedToResetData': 'ไม่สามารถรีเซ็ตข้อมูลได้ กรุณาลองอีกครั้ง',
    
    // Common
    'loading': 'กำลังโหลด...',
    'language': 'ภาษา',
    'lao': 'ลาว',
    'english': 'อังกฤษ',
    'thai': 'ไทย',
    'toggleTheme': 'สลับธีม',
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
    
    // Fund management
    'fundManagement': 'ການຈັດການກອງທຶນ',
    'deposit': 'ຝາກເງິນ',
    'withdraw': 'ຖອນເງິນ',
    'transfer': 'ໂອນເງິນ',
    'amount': 'ຈຳນວນເງິນ (USD)',
    'from': 'ຈາກ',
    'to': 'ໄປ',
    'processing': 'ກຳລັງປະມວນຜົນ...',
    'willBeSplit': 'ຈະຖືກແບ່ງ',
    'toActiveFund': 'ໄປຍັງກອງທຶນການຄ້າ',
    'toReserveFund': 'ໄປຍັງກອງທຶນສະສົມ',
    'transferBetweenAccounts': 'ໂອນລະຫວ່າງບັນຊີ',
    'mainAccount': 'ບັນຊີຫຼັກ',
    'subAccount': 'ບັນຊີຍ່ອຍ',
    'fromFund': 'ຈາກກອງທຶນ',
    'toFund': 'ໄປຍັງກອງທຶນ',
    
    // Additional translations
    'capitalGrowth': 'ການເຕີບໂຕຂອງທຶນ',
    'tradingHistory': 'ປະຫວັດການເທດ',
    'fundTransactionHistory': 'ປະຫວັດທຸລະກຳກອງທຶນ',
    'recordTradeResult': 'ບັນທຶກຜົນການເທດ',
    'lotCalculator': 'ຄຳນວນລ໌ອດ',
    'initializeFund': 'ເລີ່ມຕົ້ນກອງທຶນ',
    'initialCapital': 'ທຶນເລີ່ມຕົ້ນ (USD)',
    'setUpInitialCapital': 'ຕັ້ງຄ່າທຶນເລີ່ມຕົ້ນຂອງທ່ານສຳລັບໂໝດ',
    'endOfWeekActiveFundBalance': 'ຍອດກອງທຶນການຄ້າສິ້ນສັບປະດາ',
    'recordWeeklyResult': 'ບັນທຶກຜົນລາຍສັບປະດາ',
    'initialize': 'ເລີ່ມຕົ້ນ',
    'initialCapitalSet': 'ຕັ້ງທຶນເລີ່ມຕົ້ນເປັນ',
    'depositedAmount': 'ຝາກເງິນ',
    'settingsUpdate': 'ອັບເດດການຕັ້ງຄ່າ',
    'updatedProfitDistribution': 'ອັບເດດການກະຈາຍກຳໄລ',
    'monthlyGrowth': 'ການເຕີບໂຕລາຍເດືອນ',
    
    // Reset functionality
    'resetData': 'ຣີເຊັດຂໍ້ມູນ',
    'resetDataConfirm': 'ຣີເຊັດຂໍ້ມູນທັງໝົດ?',
    'resetDataWarning': 'ການກະທຳນີ້ຈະລຶບປະຫວັດການເທດ, ທຸລະກຳ, ແລະ ຣີເຊັດຂໍ້ມູນກອງທຶນເປັນຄ່າເລີ່ມຕົ້ນຢ່າງຖາວອນ. ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.',
    'resetSubUserWarning': 'ການກະທຳນີ້ຈະລຶບຂໍ້ມູນທັງໝົດຂອງບັນຊີຍ່ອຍ "{name}" ຢ່າງຖາວອນ. ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.',
    'dataResetSuccess': 'ຣີເຊັດຂໍ້ມູນສຳເລັດ',
    'allDataHasBeenReset': 'ຂໍ້ມູນທັງໝົດໄດ້ຮັບການຣີເຊັດເປັນຄ່າເລີ່ມຕົ້ນແລ້ວ',
    'subUserDataReset': 'ຂໍ້ມູນບັນຊີຍ່ອຍ {name} ໄດ້ຮັບການຣີເຊັດແລ້ວ',
    'failedToResetData': 'ບໍ່ສາມາດຣີເຊັດຂໍ້ມູນໄດ້. ກະລຸນາລອງອີກຄັ້ງ.',
    
    // Common
    'loading': 'ກຳລັງໂຫຼດ...',
    'language': 'ພາສາ',
    'lao': 'ລາວ',
    'english': 'ອັງກິດ',
    'thai': 'ໄທ',
    'toggleTheme': 'ສະຫຼັບທີມ',
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
    return updatedTranslations[language][key as keyof typeof updatedTranslations['en']] || key;
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