/**
 * Official Akdeniz Üniversitesi design-system React components.
 *
 * Re-exported from @akdenizcse/design-system under `Akd`-prefixed names so
 * they can be used alongside the app's shadcn primitives (which share names
 * like Button/Card/Badge) without collision.
 *
 * Styling lives in src/styles/akdeniz-components.css (authored from the
 * design system's tokens), imported globally via globals.css — the upstream
 * package does not ship its component CSS.
 *
 * Example:
 *   import { AkdButton, AkdBadge } from "@/components/akdeniz";
 *   <AkdButton variant="accent">Kaydet</AkdButton>
 */
export {
  Button as AkdButton,
  Field as AkdField,
  Input as AkdInput,
  Select as AkdSelect,
  Textarea as AkdTextarea,
  Badge as AkdBadge,
  Card as AkdCard,
  Alert as AkdAlert,
  Tabs as AkdTabs,
  brand as akdenizBrand,
  version as akdenizDsVersion,
} from "@akdenizcse/design-system";

export type {
  ButtonProps,
  FieldProps,
  BadgeProps,
  CardProps,
  AlertProps,
  TabsProps,
  TabItem,
  Tone,
  CardTone,
  ButtonVariant,
  Size,
} from "@akdenizcse/design-system";
