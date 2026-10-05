"use client";
import type { CSSProperties } from "react";
import type { ComponentType } from "react";
import type { IconProps as PhosphorIconProps, IconWeight } from "@phosphor-icons/react";
// Imports NOMBRADOS (no `import * as`): con el namespace + `as any` el bundler no podía descartar
// los ~9.000 iconos sin usar y metía un chunk de 5,4 MB en TODAS las páginas.
import {
  AppWindow as PhAppWindow,
  Archive as PhArchive,
  ArrowBendDownLeft as PhArrowBendDownLeft,
  ArrowBendUpLeft as PhArrowBendUpLeft,
  ArrowBendUpRight as PhArrowBendUpRight,
  ArrowClockwise as PhArrowClockwise,
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowDown as PhArrowDown,
  ArrowLeft as PhArrowLeft,
  ArrowLineDown as PhArrowLineDown,
  ArrowLineUp as PhArrowLineUp,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUUpLeft as PhArrowUUpLeft,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowsIn as PhArrowsIn,
  ArrowsLeftRight as PhArrowsLeftRight,
  ArrowsOut as PhArrowsOut,
  ArrowsOutCardinal as PhArrowsOutCardinal,
  At as PhAt,
  Bell as PhBell,
  BellSlash as PhBellSlash,
  Briefcase as PhBriefcase,
  Buildings as PhBuildings,
  Cake as PhCake,
  Calendar as PhCalendar,
  CalendarBlank as PhCalendarBlank,
  CalendarX as PhCalendarX,
  Camera as PhCamera,
  CaretDoubleLeft as PhCaretDoubleLeft,
  CaretDoubleRight as PhCaretDoubleRight,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  ChartBar as PhChartBar,
  ChartLine as PhChartLine,
  ChartPie as PhChartPie,
  ChatCenteredText as PhChatCenteredText,
  ChatCircle as PhChatCircle,
  ChatDots as PhChatDots,
  ChatText as PhChatText,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  CheckSquare as PhCheckSquare,
  Checks as PhChecks,
  Circle as PhCircle,
  CircleDashed as PhCircleDashed,
  CircleNotch as PhCircleNotch,
  ClipboardText as PhClipboardText,
  Clock as PhClock,
  Code as PhCode,
  Coffee as PhCoffee,
  Command as PhCommand,
  Confetti as PhConfetti,
  Copy as PhCopy,
  Crown as PhCrown,
  CurrencyDollar as PhCurrencyDollar,
  Cursor as PhCursor,
  DeviceMobile as PhDeviceMobile,
  DotsSixVertical as PhDotsSixVertical,
  DotsThree as PhDotsThree,
  DotsThreeVertical as PhDotsThreeVertical,
  DownloadSimple as PhDownloadSimple,
  Envelope as PhEnvelope,
  EnvelopeOpen as PhEnvelopeOpen,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  File as PhFile,
  FileAudio as PhFileAudio,
  FileCode as PhFileCode,
  FileImage as PhFileImage,
  FileText as PhFileText,
  FileVideo as PhFileVideo,
  FileXls as PhFileXls,
  FileZip as PhFileZip,
  Fire as PhFire,
  Flag as PhFlag,
  FloppyDisk as PhFloppyDisk,
  Folder as PhFolder,
  FolderOpen as PhFolderOpen,
  FolderPlus as PhFolderPlus,
  FolderSimple as PhFolderSimple,
  Funnel as PhFunnel,
  Gauge as PhGauge,
  Gear as PhGear,
  Gift as PhGift,
  GitMerge as PhGitMerge,
  Globe as PhGlobe,
  GraduationCap as PhGraduationCap,
  GridFour as PhGridFour,
  Hand as PhHand,
  HardDrive as PhHardDrive,
  HardDrives as PhHardDrives,
  Hash as PhHash,
  Heart as PhHeart,
  House as PhHouse,
  HouseSimple as PhHouseSimple,
  Image as PhImage,
  Info as PhInfo,
  Kanban as PhKanban,
  Key as PhKey,
  Lightning as PhLightning,
  LightningSlash as PhLightningSlash,
  Link as PhLink,
  LinkSimple as PhLinkSimple,
  List as PhList,
  ListBullets as PhListBullets,
  ListNumbers as PhListNumbers,
  Lock as PhLock,
  MagicWand as PhMagicWand,
  MagnifyingGlass as PhMagnifyingGlass,
  MagnifyingGlassMinus as PhMagnifyingGlassMinus,
  MagnifyingGlassPlus as PhMagnifyingGlassPlus,
  MapPin as PhMapPin,
  Medal as PhMedal,
  Megaphone as PhMegaphone,
  Microphone as PhMicrophone,
  MicrophoneSlash as PhMicrophoneSlash,
  Monitor as PhMonitor,
  MonitorPlay as PhMonitorPlay,
  MoonStars as PhMoonStars,
  Note as PhNote,
  Palette as PhPalette,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Paperclip as PhPaperclip,
  Pause as PhPause,
  Pencil as PhPencil,
  PencilSimple as PhPencilSimple,
  Percent as PhPercent,
  Phone as PhPhone,
  PhoneIncoming as PhPhoneIncoming,
  PhoneOutgoing as PhPhoneOutgoing,
  PhoneX as PhPhoneX,
  PictureInPicture as PhPictureInPicture,
  Play as PhPlay,
  Plug as PhPlug,
  Plus as PhPlus,
  Presentation as PhPresentation,
  Prohibit as PhProhibit,
  Pulse as PhPulse,
  PushPin as PhPushPin,
  PushPinSlash as PhPushPinSlash,
  Quotes as PhQuotes,
  Record as PhRecord,
  Robot as PhRobot,
  Rows as PhRows,
  ShareNetwork as PhShareNetwork,
  Shield as PhShield,
  ShieldCheck as PhShieldCheck,
  Sidebar as PhSidebar,
  SidebarSimple as PhSidebarSimple,
  SignOut as PhSignOut,
  Smiley as PhSmiley,
  Sparkle as PhSparkle,
  SpeakerHigh as PhSpeakerHigh,
  SpeakerSlash as PhSpeakerSlash,
  Square as PhSquare,
  SquaresFour as PhSquaresFour,
  Star as PhStar,
  Sun as PhSun,
  Tag as PhTag,
  Target as PhTarget,
  TextB as PhTextB,
  TextHTwo as PhTextHTwo,
  TextItalic as PhTextItalic,
  ThumbsUp as PhThumbsUp,
  Translate as PhTranslate,
  Trash as PhTrash,
  TrashSimple as PhTrashSimple,
  Tray as PhTray,
  TreeStructure as PhTreeStructure,
  TrendUp as PhTrendUp,
  Trophy as PhTrophy,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserCircle as PhUserCircle,
  UserCircleCheck as PhUserCircleCheck,
  UserGear as PhUserGear,
  UserMinus as PhUserMinus,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  UsersThree as PhUsersThree,
  VideoCamera as PhVideoCamera,
  VideoCameraSlash as PhVideoCameraSlash,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  WarningOctagon as PhWarningOctagon,
  WaveSine as PhWaveSine,
  WhatsappLogo as PhWhatsappLogo,
  WifiSlash as PhWifiSlash,
  Wine as PhWine,
  Wrench as PhWrench,
  X as PhX,
  XCircle as PhXCircle,
} from "@phosphor-icons/react";

interface IconProps {
  size?: number | string;
  className?: string;
  color?: string;
  style?: CSSProperties;
  weight?: IconWeight;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

/**
 * Envuelve un ícono real de Phosphor preservando el nombre de export bootstrap/lucide legado,
 * para que los archivos que importan de aquí no tengan que tocarse. Por defecto renderiza en
 * "duotone" (decisión de producto, 2026-09) — pero si el call site ya pasa `weight` explícito
 * (Sidebar/Topbar alternan "regular"/"duotone" para el estado activo/inactivo), se respeta.
 */
function wrap(Component: ComponentType<PhosphorIconProps>) {
  function Icon({ size = 20, weight, strokeWidth, absoluteStrokeWidth, ...rest }: IconProps) {
    return <Component size={size} weight={weight ?? "duotone"} {...rest} />;
  }
  Icon.displayName = `PhosphorIcon(${(Component as any).displayName || "?"})`;
  return Icon;
}


export const Activity = wrap(PhPulse);
export const AlertCircle = wrap(PhWarningCircle);
export const AlertOctagon = wrap(PhWarningOctagon);
export const AlertTriangle = wrap(PhWarning);
export const Archive = wrap(PhArchive);
export const ArrowDown = wrap(PhArrowDown);
export const ArrowDownToLine = wrap(PhArrowLineDown);
export const ArrowLeft = wrap(PhArrowLeft);
export const ArrowLeftRight = wrap(PhArrowsLeftRight);
export const ArrowRight = wrap(PhArrowRight);
export const ArrowUp = wrap(PhArrowUp);
export const ArrowUpRight = wrap(PhArrowUpRight);
export const ArrowUpToLine = wrap(PhArrowLineUp);
export const AtSign = wrap(PhAt);
export const AudioLines = wrap(PhWaveSine);
export const Award = wrap(PhMedal);
export const Ban = wrap(PhProhibit);
export const BarChart3 = wrap(PhChartBar);
export const Bell = wrap(PhBell);
export const BellOff = wrap(PhBellSlash);
export const Bold = wrap(PhTextB);
export const Bolt = wrap(PhLightning);
export const Bot = wrap(PhRobot);
export const Briefcase = wrap(PhBriefcase);
export const Building2 = wrap(PhBuildings);
export const Cake = wrap(PhCake);
export const Calendar = wrap(PhCalendar);
export const CalendarClock = wrap(PhCalendarBlank);
export const CalendarDays = wrap(PhCalendar);
export const CalendarOff = wrap(PhCalendarX);
export const CalendarX2 = wrap(PhCalendarX);
export const Camera = wrap(PhCamera);
export const Check = wrap(PhCheck);
export const CheckCheck = wrap(PhChecks);
export const CheckCircle2 = wrap(PhCheckCircle);
export const CheckSquare = wrap(PhCheckSquare);
export const ChevronDown = wrap(PhCaretDown);
export const ChevronLeft = wrap(PhCaretLeft);
export const ChevronRight = wrap(PhCaretRight);
export const ChevronUp = wrap(PhCaretUp);
export const ChevronsLeft = wrap(PhCaretDoubleLeft);
export const ChevronsRight = wrap(PhCaretDoubleRight);
export const Circle = wrap(PhCircle);
export const CircleCheck = wrap(PhCheckCircle);
export const CircleDot = wrap(PhRecord);
export const ClipboardList = wrap(PhClipboardText);
export const Clock = wrap(PhClock);
export const Code = wrap(PhCode);
export const Coffee = wrap(PhCoffee);
export const Cog = wrap(PhGear);
export const Command = wrap(PhCommand);
export const Construction = wrap(PhWrench);
export const Copy = wrap(PhCopy);
export const CornerDownLeft = wrap(PhArrowBendDownLeft);
export const Crown = wrap(PhCrown);
export const DollarSign = wrap(PhCurrencyDollar);
export const Download = wrap(PhDownloadSimple);
export const Edit = wrap(PhPencil);
export const Edit3 = wrap(PhPencilSimple);
export const ExternalLink = wrap(PhArrowSquareOut);
export const Eye = wrap(PhEye);
export const EyeOff = wrap(PhEyeSlash);
export const File = wrap(PhFile);
export const FileArchive = wrap(PhFileZip);
export const FileAudio = wrap(PhFileAudio);
export const FileCode = wrap(PhFileCode);
export const FileImage = wrap(PhFileImage);
export const FileSpreadsheet = wrap(PhFileXls);
export const FileText = wrap(PhFileText);
export const FileType = wrap(PhFileText);
export const FileVideo = wrap(PhFileVideo);
export const Filter = wrap(PhFunnel);
export const Flag = wrap(PhFlag);
export const Flame = wrap(PhFire);
export const Folder = wrap(PhFolder);
export const FolderKanban = wrap(PhKanban);
export const FolderOpen = wrap(PhFolderOpen);
export const FolderPlus = wrap(PhFolderPlus);
export const Forward = wrap(PhArrowBendUpRight);
export const Gauge = wrap(PhGauge);
export const Gift = wrap(PhGift);
export const GitMerge = wrap(PhGitMerge);
export const Globe = wrap(PhGlobe);
export const GraduationCap = wrap(PhGraduationCap);
export const GripVertical = wrap(PhDotsSixVertical);
export const Hand = wrap(PhHand);
export const HardDrive = wrap(PhHardDrive);
export const Hash = wrap(PhHash);
export const Heading2 = wrap(PhTextHTwo);
export const Heart = wrap(PhHeart);
export const Home = wrap(PhHouse);
export const Image = wrap(PhImage);
export const Inbox = wrap(PhTray);
export const Info = wrap(PhInfo);
export const Italic = wrap(PhTextItalic);
export const KeyRound = wrap(PhKey);
export const Languages = wrap(PhTranslate);
export const LayoutDashboard = wrap(PhSquaresFour);
export const LayoutGrid = wrap(PhGridFour);
export const LayoutList = wrap(PhListBullets);
export const Link = wrap(PhLink);
export const Link2 = wrap(PhLinkSimple);
export const List = wrap(PhList);
export const ListOrdered = wrap(PhListNumbers);
export const ListTree = wrap(PhTreeStructure);
export const Loader2 = wrap(PhCircleNotch);
export const Lock = wrap(PhLock);
export const LogOut = wrap(PhSignOut);
export const Mail = wrap(PhEnvelope);
export const MailOpen = wrap(PhEnvelopeOpen);
export const MapPin = wrap(PhMapPin);
export const Maximize2 = wrap(PhArrowsOut);
export const Megaphone = wrap(PhMegaphone);
export const MessageSquare = wrap(PhChatText);
export const MessageSquareMore = wrap(PhChatDots);
export const MessagesSquare = wrap(PhChatCenteredText);
export const Mic = wrap(PhMicrophone);
export const MicOff = wrap(PhMicrophoneSlash);
export const Minimize2 = wrap(PhArrowsIn);
export const Monitor = wrap(PhMonitor);
export const MonitorUp = wrap(PhMonitorPlay);
export const Moon = wrap(PhMoonStars);
export const MoreHorizontal = wrap(PhDotsThree);
export const MoreVertical = wrap(PhDotsThreeVertical);
export const Move = wrap(PhArrowsOutCardinal);
export const MousePointer2 = wrap(PhCursor);
export const Network = wrap(PhShareNetwork);
export const Palette = wrap(PhPalette);
export const PanelLeftClose = wrap(PhSidebarSimple);
export const PanelLeftOpen = wrap(PhSidebar);
export const Paperclip = wrap(PhPaperclip);
export const PartyPopper = wrap(PhConfetti);
export const Pause = wrap(PhPause);
export const Pencil = wrap(PhPencil);
export const Percent = wrap(PhPercent);
export const Phone = wrap(PhPhone);
export const PhoneCall = wrap(PhPhoneOutgoing);
export const PhoneIncoming = wrap(PhPhoneIncoming);
export const PhoneMissed = wrap(PhPhoneX);
export const PhoneOff = wrap(PhPhoneX);
export const PictureInPicture2 = wrap(PhPictureInPicture);
export const PieChart = wrap(PhChartPie);
export const Pin = wrap(PhPushPin);
export const PinOff = wrap(PhPushPinSlash);
export const Play = wrap(PhPlay);
export const Plus = wrap(PhPlus);
export const Presentation = wrap(PhPresentation);
export const Quote = wrap(PhQuotes);
export const Redo2 = wrap(PhArrowClockwise);
export const RefreshCw = wrap(PhArrowsClockwise);
export const Reply = wrap(PhArrowBendUpLeft);
export const RotateCcw = wrap(PhArrowCounterClockwise);
export const Rows = wrap(PhRows);
export const Save = wrap(PhFloppyDisk);
export const ScreenShare = wrap(PhMonitor);
export const ScreenShareOff = wrap(PhMonitor);
export const Search = wrap(PhMagnifyingGlass);
export const Send = wrap(PhPaperPlaneTilt);
export const Server = wrap(PhHardDrives);
export const Settings = wrap(PhGear);
export const Share2 = wrap(PhShareNetwork);
export const Shield = wrap(PhShield);
export const ShieldCheck = wrap(PhShieldCheck);
export const Smartphone = wrap(PhDeviceMobile);
export const Smile = wrap(PhSmiley);
export const SmilePlus = wrap(PhSmiley);
export const Sparkle = wrap(PhSparkle);
export const Sparkles = wrap(PhSparkle);
export const Square = wrap(PhSquare);
export const Star = wrap(PhStar);
export const StickyNote = wrap(PhNote);
export const Sun = wrap(PhSun);
export const Tag = wrap(PhTag);
export const Target = wrap(PhTarget);
export const ThumbsUp = wrap(PhThumbsUp);
export const Trash = wrap(PhTrash);
export const Trash2 = wrap(PhTrashSimple);
export const TrendingUp = wrap(PhTrendUp);
export const Trophy = wrap(PhTrophy);
export const Undo2 = wrap(PhArrowUUpLeft);
export const Upload = wrap(PhUploadSimple);
export const User = wrap(PhUser);
export const UserCheck = wrap(PhUserCircleCheck);
export const UserCircle = wrap(PhUserCircle);
export const UserCircle2 = wrap(PhUserCircle);
export const UserCog = wrap(PhUserGear);
export const UserPlus = wrap(PhUserPlus);
export const UserX = wrap(PhUserMinus);
export const Users = wrap(PhUsers);
export const Users2 = wrap(PhUsersThree);
export const Video = wrap(PhVideoCamera);
export const VideoOff = wrap(PhVideoCameraSlash);
export const Volume2 = wrap(PhSpeakerHigh);
export const VolumeX = wrap(PhSpeakerSlash);
export const Wand2 = wrap(PhMagicWand);
export const Webhook = wrap(PhPlug);
export const WifiOff = wrap(PhWifiSlash);
export const WhatsappLogo = wrap(PhWhatsappLogo);
export const Wine = wrap(PhWine);
export const X = wrap(PhX);
export const XCircle = wrap(PhXCircle);
export const Zap = wrap(PhLightning);
export const ZapOff = wrap(PhLightningSlash);
export const ZoomIn = wrap(PhMagnifyingGlassPlus);
export const ZoomOut = wrap(PhMagnifyingGlassMinus);
export const AppWindow = wrap(PhAppWindow);
export const CaretDown = wrap(PhCaretDown);
export const CaretLeft = wrap(PhCaretLeft);
export const CaretRight = wrap(PhCaretRight);
export const ChartLine = wrap(PhChartLine);
export const ChatCircle = wrap(PhChatCircle);
export const CircleDashed = wrap(PhCircleDashed);
export const CurrencyDollar = wrap(PhCurrencyDollar);
export const Envelope = wrap(PhEnvelope);
export const Fire = wrap(PhFire);
export const FolderSimple = wrap(PhFolderSimple);
export const Gear = wrap(PhGear);
export const HouseSimple = wrap(PhHouseSimple);
export const Lightning = wrap(PhLightning);
export const MagicWand = wrap(PhMagicWand);
export const MagnifyingGlass = wrap(PhMagnifyingGlass);
export const MoonStars = wrap(PhMoonStars);
export const SignOut = wrap(PhSignOut);
export const Tray = wrap(PhTray);
export const TrendUp = wrap(PhTrendUp);
export const Warning = wrap(PhWarning);
export const ArrowSquareOut = wrap(PhArrowSquareOut);
export const WarningCircle = wrap(PhWarningCircle);
