
import React from 'react';



// Common props for icons
type IconProps = { className?: string };

const MaterialIcon = ({ name, className }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

export const HomeIcon = ({ className }: IconProps) => <MaterialIcon name="dashboard" className={className} />;
export const UsersIcon = ({ className }: IconProps) => <MaterialIcon name="group" className={className} />;
export const CheckCircleIcon = ({ className }: IconProps) => <MaterialIcon name="check_circle" className={className} />;
export const DocumentReportIcon = ({ className }: IconProps) => <MaterialIcon name="description" className={className} />;
export const CogIcon = ({ className }: IconProps) => <MaterialIcon name="settings" className={className} />;
export const ClockIcon = ({ className }: IconProps) => <MaterialIcon name="schedule" className={className} />; // or watch_later
export const DocumentAddIcon = ({ className }: IconProps) => <MaterialIcon name="post_add" className={className} />;
export const CollectionIcon = ({ className }: IconProps) => <MaterialIcon name="inventory_2" className={className} />;
export const LocationMarkerIcon = ({ className }: IconProps) => <MaterialIcon name="location_on" className={className} />;
export const PlusCircleIcon = ({ className }: IconProps) => <MaterialIcon name="add_circle" className={className} />;
export const XIcon = ({ className }: IconProps) => <MaterialIcon name="close" className={className} />;
export const PaperClipIcon = ({ className }: IconProps) => <MaterialIcon name="attach_file" className={className} />;
export const CalendarIcon = ({ className }: IconProps) => <MaterialIcon name="calendar_month" className={className} />;
export const TimeIcon = ({ className }: IconProps) => <MaterialIcon name="schedule" className={className} />;
export const UploadIcon = ({ className }: IconProps) => <MaterialIcon name="upload" className={className} />;
export const SearchIcon = ({ className }: IconProps) => <MaterialIcon name="search" className={className} />;
export const FilterIcon = ({ className }: IconProps) => <MaterialIcon name="filter_list" className={className} />;
export const ChevronLeftIcon = ({ className }: IconProps) => <MaterialIcon name="chevron_left" className={className} />;
export const ChevronRightIcon = ({ className }: IconProps) => <MaterialIcon name="chevron_right" className={className} />;
export const DownloadIcon = ({ className }: IconProps) => <MaterialIcon name="download" className={className} />;
export const ChevronDoubleLeftIcon = ({ className }: IconProps) => <MaterialIcon name="keyboard_double_arrow_left" className={className} />;
export const ChevronDoubleDownIcon = ({ className }: IconProps) => <MaterialIcon name="keyboard_double_arrow_down" className={className} />;
export const ExcelIcon = ({ className }: IconProps) => <MaterialIcon name="table_view" className={className} />; // No specific excel icon in material symbols
export const PrintIcon = ({ className }: IconProps) => <MaterialIcon name="print" className={className} />;
export const OfficeBuildingIcon = ({ className }: IconProps) => <MaterialIcon name="domain" className={className} />;
export const BriefcaseIcon = ({ className }: IconProps) => <MaterialIcon name="work" className={className} />;
export const PencilIcon = ({ className }: IconProps) => <MaterialIcon name="edit" className={className} />;
export const TrashIcon = ({ className }: IconProps) => <MaterialIcon name="delete" className={className} />;
export const ColorSwatchIcon = ({ className }: IconProps) => <MaterialIcon name="palette" className={className} />;
export const SaveIcon = ({ className }: IconProps) => <MaterialIcon name="save" className={className} />;
export const BellIcon = ({ className }: IconProps) => <MaterialIcon name="notifications" className={className} />;
export const CalculatorIcon = ({ className }: IconProps) => <MaterialIcon name="calculate" className={className} />;
export const CurrencyDollarIcon = ({ className }: IconProps) => <MaterialIcon name="payments" className={className} />;
export const MenuIcon = ({ className }: IconProps) => <MaterialIcon name="menu" className={className} />;
export const LogoutIcon = ({ className }: IconProps) => <MaterialIcon name="logout" className={className} />;
export const AcademicCapIcon = ({ className }: IconProps) => <MaterialIcon name="school" className={className} />;
export const CameraIcon = ({ className }: IconProps) => <MaterialIcon name="photo_camera" className={className} />;
export const RefreshIcon = ({ className }: IconProps) => <MaterialIcon name="refresh" className={className} />;
export const LockClosedIcon = ({ className }: IconProps) => <MaterialIcon name="lock" className={className} />;
export const InformationCircleIcon = ({ className }: IconProps) => <MaterialIcon name="info" className={className} />;
export const ExclamationCircleIcon = ({ className }: IconProps) => <MaterialIcon name="error" className={className} />;
export const UserIcon = ({ className }: IconProps) => <MaterialIcon name="person" className={className} />;
export const QrCodeIcon = ({ className }: IconProps) => <MaterialIcon name="qr_code_scanner" className={className} />;
