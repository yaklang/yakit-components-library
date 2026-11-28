import type { ReactElement } from 'react'

import {
  Modal,
  YakitModalCompat,
  type ModalProps,
  type ModalStatus,
  type YakitModalCompatProps,
} from '../../src/components'

export const status: ModalStatus = 'success'

export const modalProps: ModalProps = {
  open: true,
  title: 'Title',
  status,
  onCancel: () => undefined,
}

export const modal: ReactElement = <Modal {...modalProps}>Body</Modal>

export const compatProps: YakitModalCompatProps = {
  visible: true,
  title: 'Legacy',
}

export const compat: ReactElement = <YakitModalCompat {...compatProps} />

// @ts-expect-error warning2 is not a public ModalStatus.
export const invalidStatus: ModalStatus = 'warning2'
