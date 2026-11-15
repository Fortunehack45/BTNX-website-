import { AuthenticatedCustomer, AuthorizationResult } from "./types.js";

/**
 * Validates that an authenticated customer owns the targeted resource,
 * or possesses administrative override privileges.
 */
export function authorizeResourceOwner(
  customer: AuthenticatedCustomer | null,
  resourceOwnerUid: string
): AuthorizationResult {
  if (!customer) {
    return {
      authorized: false,
      reason: "Authentication required. Please sign in to access this resource.",
    };
  }

  if (!resourceOwnerUid) {
    return {
      authorized: false,
      reason: "Invalid resource ownership metadata.",
    };
  }

  if (customer.role === "admin") {
    return { authorized: true, customer };
  }

  if (customer.uid === resourceOwnerUid) {
    return { authorized: true, customer };
  }

  return {
    authorized: false,
    reason: "Access denied. You do not have permission to view or modify this resource.",
    customer,
  };
}

/**
 * Validates that an authenticated customer has the 'admin' role.
 * Role must come from verified server-side identity, never from client parameters.
 */
export function authorizeAdmin(
  customer: AuthenticatedCustomer | null
): AuthorizationResult {
  if (!customer) {
    return {
      authorized: false,
      reason: "Administrator authentication required.",
    };
  }

  if (customer.role === "admin") {
    return { authorized: true, customer };
  }

  return {
    authorized: false,
    reason: "Administrative privilege required for this operation.",
    customer,
  };
}

/**
 * Validates that an authenticated user has customer support or administrative role.
 */
export function authorizeSupport(
  customer: AuthenticatedCustomer | null
): AuthorizationResult {
  if (!customer) {
    return {
      authorized: false,
      reason: "Support staff authentication required.",
    };
  }

  if (customer.role === "admin" || customer.role === "support") {
    return { authorized: true, customer };
  }

  return {
    authorized: false,
    reason: "Support privilege required for this operation.",
    customer,
  };
}
