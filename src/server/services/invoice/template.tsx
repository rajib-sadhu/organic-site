import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatPaise } from "@/lib/money";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#211e19" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#24503a" },
  tagline: { fontSize: 8, color: "#6d655a", marginTop: 2 },
  invoiceTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" as const },
  invoiceNo: { fontSize: 9, color: "#6d655a", textAlign: "right" as const, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#6d655a", textTransform: "uppercase" as const, marginBottom: 6, letterSpacing: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  label: { color: "#6d655a" },
  value: { fontFamily: "Helvetica-Bold" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e7e1d3", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#f1ebdf" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "center" as const },
  col3: { flex: 1.5, textAlign: "right" as const },
  col4: { flex: 1.5, textAlign: "right" as const },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6d655a", textTransform: "uppercase" as const },
  totals: { marginTop: 12, alignItems: "flex-end" as const },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { color: "#6d655a" },
  totalValue: { fontFamily: "Helvetica-Bold" },
  grandTotal: { borderTopWidth: 1, borderTopColor: "#24503a", paddingTop: 4, marginTop: 4 },
  grandTotalText: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#24503a" },
  footer: { position: "absolute" as const, bottom: 30, left: 40, right: 40, textAlign: "center" as const, fontSize: 8, color: "#6d655a" },
});

export type InvoiceData = {
  invoiceNo: string;
  orderNo: string;
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: {
    name: string;
    variant: string;
    qty: number;
    unitPaise: number;
    linePaise: number;
  }[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  totalPaise: number;
  paymentMethod: string;
  couponCode: string | null;
};

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Verdant</Text>
            <Text style={s.tagline}>Pure organic foods, delivered fresh</Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceNo}>{data.invoiceNo}</Text>
            <Text style={s.invoiceNo}>Date: {data.date}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Bill To</Text>
            <Text style={s.value}>{data.customer.name}</Text>
            <Text>{data.customer.email}</Text>
            <Text>{data.customer.phone}</Text>
            <Text style={{ maxWidth: 220, marginTop: 2 }}>{data.customer.address}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Order Details</Text>
            <View style={s.row}>
              <Text style={s.label}>Order No:</Text>
              <Text style={s.value}>{data.orderNo}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Payment:</Text>
              <Text>{data.paymentMethod === "COD" ? "Cash on Delivery" : "Online (Razorpay)"}</Text>
            </View>
            {data.couponCode && (
              <View style={s.row}>
                <Text style={s.label}>Coupon:</Text>
                <Text>{data.couponCode}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items table */}
        <View style={s.section}>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.col1]}>Item</Text>
            <Text style={[s.th, s.col2]}>Qty</Text>
            <Text style={[s.th, s.col3]}>Unit Price</Text>
            <Text style={[s.th, s.col4]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <View style={s.col1}>
                <Text>{item.name}</Text>
                <Text style={{ fontSize: 8, color: "#6d655a" }}>{item.variant}</Text>
              </View>
              <Text style={s.col2}>{item.qty}</Text>
              <Text style={s.col3}>{formatPaise(item.unitPaise)}</Text>
              <Text style={s.col4}>{formatPaise(item.linePaise)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{formatPaise(data.subtotalPaise)}</Text>
          </View>
          {data.discountPaise > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Discount</Text>
              <Text style={[s.totalValue, { color: "#3c7a52" }]}>-{formatPaise(data.discountPaise)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Shipping</Text>
            <Text style={s.totalValue}>{data.shippingPaise === 0 ? "Free" : formatPaise(data.shippingPaise)}</Text>
          </View>
          {data.codFeePaise > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>COD Fee</Text>
              <Text style={s.totalValue}>{formatPaise(data.codFeePaise)}</Text>
            </View>
          )}
          <View style={[s.totalRow, s.grandTotal]}>
            <Text style={s.grandTotalText}>Total</Text>
            <Text style={s.grandTotalText}>{formatPaise(data.totalPaise)}</Text>
          </View>
        </View>

        <Text style={s.footer}>
          Thank you for choosing Verdant! This is a computer-generated invoice and does not require a signature.
        </Text>
      </Page>
    </Document>
  );
}
