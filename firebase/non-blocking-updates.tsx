'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Lógica mejorada para distinguir errores de permisos de errores de sistema (como tamaño de documento).
 */
function handleError(error: any, path: string, operation: string, data?: any) {
  console.error(`🔥 FIRESTORE ERROR [${operation}] en ${path}:`, error);
  
  if (error.code === 'permission-denied') {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path,
        operation: operation as any,
        requestResourceData: data,
      })
    );
  } else if (error.message && error.message.includes('too large')) {
    // Emitimos un error de sistema si el documento excede el límite de 1MB
    console.warn("⚠️ DOCUMENTO DEMASIADO GRANDE: Reduce el tamaño o cantidad de fotos.");
    // No lanzamos error de permisos, solo logueamos para evitar confundir al LLM/Usuario
  }
}

export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    handleError(error, docRef.path, 'write', data);
  });
}

export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data).catch(error => {
    handleError(error, colRef.path, 'create', data);
  });
  return promise;
}

export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data).catch(error => {
    handleError(error, docRef.path, 'update', data);
  });
}

export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef).catch(error => {
    handleError(error, docRef.path, 'delete');
  });
}