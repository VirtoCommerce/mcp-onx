export interface CustomerOrderSearchResult {
    totalCount: number;
    results: CustomerOrder[];
}

export interface CustomerOrder {
    rowVersion: string;
    customerId: string;
    customerName: string;
    channelId: string;
    storeId: string;
    storeName: string;
    organizationId: string;
    organizationName: string;
    employeeId: string;
    employeeName: string;
    shoppingCartId: string;
    isPrototype: boolean;
    purchaseOrderNumber: string;
    subscriptionNumber: string;
    subscriptionId: string;
    objectType: string;
    addresses: Address[];
    inPayments: PaymentIn[];
    items: LineItem[];
    shipments: Shipment[];
    feeDetails: FeeDetail[];
    relevanceScore: number;
    discounts: Discount[];
    discountAmount: number;
    taxDetails: TaxDetail[];
    scopes: string[];
    total: number;
    subTotal: number;
    subTotalWithTax: number;
    subTotalDiscount: number;
    subTotalDiscountWithTax: number;
    subTotalTaxTotal: number;
    shippingTotal: number;
    shippingTotalWithTax: number;
    shippingSubTotal: number;
    shippingSubTotalWithTax: number;
    shippingDiscountTotal: number;
    shippingDiscountTotalWithTax: number;
    shippingTaxTotal: number;
    paymentTotal: number;
    paymentTotalWithTax: number;
    paymentSubTotal: number;
    paymentSubTotalWithTax: number;
    paymentDiscountTotal: number;
    paymentDiscountTotalWithTax: number;
    paymentTaxTotal: number;
    discountTotal: number;
    discountTotalWithTax: number;
    fee: number;
    feeWithTax: number;
    feeTotal: number;
    feeTotalWithTax: number;
    handlingTotal: number;
    handlingTotalWithTax: number;
    isAnonymous: boolean;
    taxType: string;
    taxTotal: number;
    taxPercentRate: number;
    languageCode: string;
    operationType: string;
    parentOperationId: string;
    number: string;
    isApproved: boolean;
    status: string;
    comment: string;
    currency: string;
    sum: number;
    outerId: string;
    cancelledState: string;
    isCancelled: boolean;
    cancelledDate: string;
    cancelReason: string;
    dynamicProperties: DynamicProperty[];
    operationsLog: OperationsLog[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface Shipment {
    organizationId: string;
    organizationName: string;
    fulfillmentCenterId: string;
    fulfillmentCenterName: string;
    employeeId: string;
    employeeName: string;
    shipmentMethodCode: string;
    shipmentMethodOption: string;
    shippingMethod: ShippingMethod;
    customerOrderId: string;
    customerOrder: string;
    items: ShipmentItem[];
    packages: ShipmentPackage[];
    inPayments: PaymentIn[];
    feeDetails: FeeDetail[];
    weightUnit: string;
    weight: number;
    measureUnit: string;
    height: number;
    length: number;
    width: number;
    discounts: Discount[];
    deliveryAddress: Address;
    price: number;
    priceWithTax: number;
    total: number;
    totalWithTax: number;
    discountAmount: number;
    discountAmountWithTax: number;
    pickupLocationId: string;
    fee: number;
    feeWithTax: number;
    trackingNumber: string;
    trackingUrl: string;
    deliveryDate: string;
    objectType: string;
    vendorId: string;
    taxType: string;
    taxTotal: number;
    taxPercentRate: number;
    taxDetails: TaxDetail[];
    operationType: string;
    parentOperationId: string;
    number: string;
    isApproved: boolean;
    status: string;
    comment: string;
    currency: string;
    sum: number;
    outerId: string;
    cancelledState: string;
    isCancelled: boolean;
    cancelledDate: string;
    cancelReason: string;
    dynamicProperties: DynamicProperty[];
    operationsLog: OperationsLog[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface ShipmentPackage {
    barCode: string;
    packageType: string;
    items: ShipmentItem[];
    weightUnit: string;
    weight: number;
    measureUnit: string;
    height: number;
    length: number;
    width: number;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface ShipmentItem {
    lineItemId: string;
    lineItem: LineItem;
    barCode: string;
    quantity: number;
    outerId: string;
    status: string;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface ShippingMethod {
    code: string;
    name: string;
    description: string;
    logoUrl: string;
    isActive: boolean;
    priority: number;
    taxType: string;
    storeId: string;
    typeName: string;
    id: string;
}

export interface PaymentIn {
    orderId: string;
    purpose: string;
    gatewayCode: string;
    paymentMethod: PaymentMethod;
    organizationId: string;
    organizationName: string;
    customerId: string;
    customerName: string;
    incomingDate: string;
    billingAddress: Address;
    paymentStatus: string;
    authorizedDate: string;
    capturedDate: string;
    voidedDate: string;
    processPaymentResult: ProcessPaymentResult;
    price: number;
    priceWithTax: number;
    total: number;
    totalWithTax: number;
    discountAmount: number;
    discountAmountWithTax: number;
    objectType: string;
    feeDetails: FeeDetail[];
    vendorId: string;
    taxType: string;
    taxTotal: number;
    taxPercentRate: number;
    taxDetails: TaxDetail[];
    discounts: Discount[];
    transactions: Transaction[];
    refunds: Refund[];
    captures: Capture[];
    operationType: string;
    parentOperationId: string;
    number: string;
    isApproved: boolean;
    status: string;
    comment: string;
    currency: string;
    sum: number;
    outerId: string;
    cancelledState: string;
    isCancelled: boolean;
    cancelledDate: string;
    cancelReason: string;
    dynamicProperties: DynamicProperty[];
    operationsLog: OperationsLog[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface Capture {
    objectType: string;
    amount: number;
    vendorId: string;
    transactionId: string;
    customerOrderId: string;
    paymentId: string;
    items: CaptureItem[];
    closeTransaction: boolean;
    operationType: string;
    parentOperationId: string;
    number: string;
    isApproved: boolean;
    status: string;
    comment: string;
    currency: string;
    sum: number;
    outerId: string;
    cancelledState: string;
    isCancelled: boolean;
    cancelledDate: string;
    cancelReason: string;
    dynamicProperties: DynamicProperty[];
    operationsLog: OperationsLog[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface CaptureItem {
    quantity: number;
    lineItemId: string;
    lineItem: LineItem;
    captureId: string;
    outerId: string;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface Refund {
    objectType: string;
    amount: number;
    reasonCode: string;
    refundStatus: string;
    reasonMessage: string;
    rejectReasonMessage: string;
    vendorId: string;
    transactionId: string;
    customerOrderId: string;
    paymentId: string;
    items: RefundItem[];
    operationType: string;
    parentOperationId: string;
    number: string;
    isApproved: boolean;
    status: string;
    comment: string;
    currency: string;
    sum: number;
    outerId: string;
    cancelledState: string;
    isCancelled: boolean;
    cancelledDate: string;
    cancelReason: string;
    dynamicProperties: DynamicProperty[];
    operationsLog: OperationsLog[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface OperationsLog {
    objectType: string;
    objectId: string;
    operationType: string;
    detail: string;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface RefundItem {
    quantity: number;
    lineItemId: string;
    lineItem: LineItem;
    refundId: string;
    outerId: string;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface LineItem {
    priceId: string;
    currency: string;
    price: number;
    priceWithTax: number;
    listTotal: number;
    listTotalWithTax: number;
    placedPrice: number;
    placedPriceWithTax: number;
    extendedPrice: number;
    extendedPriceWithTax: number;
    discountAmount: number;
    isDiscountAmountRounded: boolean;
    discountAmountWithTax: number;
    discountTotal: number;
    discountTotalWithTax: number;
    fee: number;
    feeWithTax: number;
    taxType: string;
    taxTotal: number;
    taxPercentRate: number;
    reserveQuantity: number;
    quantity: number;
    productId: string;
    sku: string;
    productType: string;
    catalogId: string;
    categoryId: string;
    name: string;
    productOuterId: string;
    comment: string;
    status: string;
    imageUrl: string;
    isGift: boolean;
    shippingMethodCode: string;
    fulfillmentLocationCode: string;
    fulfillmentCenterId: string;
    fulfillmentCenterName: string;
    outerId: string;
    feeDetails: FeeDetail[];
    vendorId: string;
    isConfigured: boolean;
    weightUnit: string;
    weight: number;
    measureUnit: string;
    height: number;
    length: number;
    width: number;
    isCancelled: boolean;
    cancelledDate: string;
    cancelReason: string;
    objectType: string;
    dynamicProperties: DynamicProperty[];
    discounts: Discount[];
    taxDetails: TaxDetail[];
    configurationItems: ConfigurationItem[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface ConfigurationItem {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    imageUrl: string;
    catalogId: string;
    categoryId: string;
    type: string;
    customText: string;
    files: File[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface File {
    name: string;
    url: string;
    contentType: string;
    size: number;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface DynamicProperty {
    objectId: string;
    values: DynamicPropertyValue[];
    name: string;
    description: string;
    objectType: string;
    isArray: boolean;
    isDictionary: boolean;
    isMultilingual: boolean;
    isRequired: boolean;
    displayOrder: number;
    valueType: string;
    displayNames: DisplayName[];
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface DisplayName {
    locale: string;
    name: string;
}

export interface DynamicPropertyValue {
    objectType: string;
    objectId: string;
    locale: string;
    value: any;
    valueId: string;
    valueType: string;
    propertyId: string;
    propertyName: string;
}

export interface Transaction {
    amount: number;
    currencyCode: string;
    isProcessed: boolean;
    processedDate: string;
    processError: string;
    processAttemptCount: number;
    requestData: string;
    responseData: string;
    responseCode: string;
    gatewayIpAddress: string;
    type: string;
    status: string;
    note: string;
    createdDate: string;
    modifiedDate: string;
    createdBy: string;
    modifiedBy: string;
    id: string;
}

export interface Discount {
    promotionId: string;
    currency: string;
    discountAmount: number;
    discountAmountWithTax: number;
    coupon: string;
    description: string;
    name: string;
    id: string;
}

export interface FeeDetail {
    feeId: string;
    currency: string;
    amount: number;
    description: string;
}

export interface ProcessPaymentResult {
    redirectUrl: string;
    htmlForm: string;
    outerId: string;
    paymentMethod: PaymentMethod;
    isSuccess: boolean;
    errorMessage: string;
    newPaymentStatus: string;
    publicParameters: Values;
}

export interface PaymentMethod {
    code: string;
    name: string;
    logoUrl: string;
    isActive: boolean;
    priority: number;
    isAvailableForPartial: boolean;
    allowDeferredPayment: boolean;
    currency: string;
    price: number;
    priceWithTax: number;
    total: number;
    totalWithTax: number;
    discountAmount: number;
    discountAmountWithTax: number;
    allowCartPayment: boolean;
    storeId: string;
    description: string;
    typeName: string;
    settings: Setting[];
    taxType: string;
    taxTotal: number;
    taxPercentRate: number;
    taxDetails: TaxDetail[];
    localizedName: LocalizedName;
    paymentMethodType: string;
    paymentMethodGroupType: string;
    id: string;
}

export interface LocalizedName {
    values: Values;
}

export interface Values {
    additionalProp1: string;
    additionalProp2: string;
    additionalProp3: string;
}

export interface TaxDetail {
    rate: number;
    amount: number;
    name: string;
}

export interface Setting {
    itHasValues: boolean;
    objectId: string;
    objectType: string;
    isReadOnly: boolean;
    value: any;
    id: string;
    restartRequired: boolean;
    moduleId: string;
    groupName: string;
    name: string;
    displayName: string;
    isRequired: boolean;
    isHidden: boolean;
    isPublic: boolean;
    valueType: string;
    allowedValues: any[];
    defaultValue: any;
    isDictionary: boolean;
    isLocalizable: boolean;
}

export interface Address {
    addressType: string;
    key: string;
    name: string;
    organization: string;
    countryCode: string;
    countryName: string;
    city: string;
    postalCode: string;
    zip: string;
    line1: string;
    line2: string;
    regionId: string;
    regionName: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    email: string;
    outerId: string;
    isDefault: boolean;
    description: string;
}