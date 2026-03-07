export enum CategoriaProduto {
  ACOUGUE_E_PEIXARIA = 'ACOUGUE_E_PEIXARIA',
  HORTIFRUTI = 'HORTIFRUTI',
  LATICINIOS_E_OVOS = 'LATICINIOS_E_OVOS',
  PADARIA_E_CONFEITARIA = 'PADARIA_E_CONFEITARIA',
  MERCEARIA_SECA = 'MERCEARIA_SECA',
  CONGELADOS = 'CONGELADOS',
  BEBIDAS = 'BEBIDAS',
  LIMPEZA = 'LIMPEZA',
  HIGIENE_E_BELEZA = 'HIGIENE_E_BELEZA',
  PET_SHOP = 'PET_SHOP',
  UTILIDADES_DOMESTICAS = 'UTILIDADES_DOMESTICAS',
}

export const CategoriaLabels: Record<CategoriaProduto, string> = {
  [CategoriaProduto.ACOUGUE_E_PEIXARIA]: 'Açougue e Peixaria',
  [CategoriaProduto.HORTIFRUTI]: 'Hortifruti',
  [CategoriaProduto.LATICINIOS_E_OVOS]: 'Laticínios e Ovos',
  [CategoriaProduto.PADARIA_E_CONFEITARIA]: 'Padaria e Confeitaria',
  [CategoriaProduto.MERCEARIA_SECA]: 'Mercearia Seca',
  [CategoriaProduto.CONGELADOS]: 'Congelados',
  [CategoriaProduto.BEBIDAS]: 'Bebidas',
  [CategoriaProduto.LIMPEZA]: 'Limpeza',
  [CategoriaProduto.HIGIENE_E_BELEZA]: 'Higiene e Beleza',
  [CategoriaProduto.PET_SHOP]: 'Pet Shop',
  [CategoriaProduto.UTILIDADES_DOMESTICAS]: 'Utilidades Domésticas',
}
