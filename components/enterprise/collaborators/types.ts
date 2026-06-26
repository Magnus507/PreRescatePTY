export type TabFilter = "todos" | "pending_company_review" | "paid_active" | "approved_unpaid" | "suspended" | "archived" | "rejected_by_company" | "empleados";

export type ChipInfo = {
  id: string;
  shortCode: string;
  serialPublic: string;
  status: string;
  activatedAt: string | null;
};

export type OrderInfo = {
  id: string;
  orderNumber: string;
  amount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
};

export type ProductInfo = {
  id: string;
  name: string;
  productType: string;
  image: string | null;
};

export type CorporateOrderItem = {
  id: string;
  fulfillmentStatus: string;
  activatedAt: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  product: ProductInfo;
  chip: ChipInfo | null;
  order: OrderInfo;
};

export type RequestItem = {
  quantity: number;
  product: { id: string; name: string; productType: string };
};

export type ProductRequest = {
  id: string;
  status: string;
  createdAt: string;
  items: RequestItem[];
};

export type CorporateProfile = {
  id: string;
  firstName: string;
  lastName: string;
  bloodType: string;
  phone: string | null;
  profileType: string;
};

export type Member = {
  id: string;
  corporateStatus: string;
  employeeNationalId: string | null;
  employeeAge: number | null;
  employeePhone: string | null;
  employeePosition: string | null;
  employeeDepartment: string | null;
  employeeInternalId: string | null;
  profile: {
    firstName: string;
    lastName: string;
    user: { email: string } | null;
  } | null;
};

export type CorporateKitData = {
  memberId: string;
  corporateProfile: CorporateProfile | null;
  corporateOrderItems: CorporateOrderItem[];
  productRequests: ProductRequest[];
};

export type StatusInfo = {
  label: string;
  color: string;
  bg: string;
};

export type DetailTab = "info" | "program" | "history" | "kit";