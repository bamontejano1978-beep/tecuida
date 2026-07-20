import { getMunicipalityApplicationThumbnail } from '../municipality-app-thumbnail'

describe('getMunicipalityApplicationThumbnail', () => {
  it('prioriza el icono personalizado del municipio', () => {
    expect(
      getMunicipalityApplicationThumbnail(
        'https://cdn.example.com/municipal.png',
        'https://cdn.example.com/global.png',
      ),
    ).toBe('https://cdn.example.com/municipal.png')
  })

  it('hereda el icono global cuando no hay personalización', () => {
    expect(
      getMunicipalityApplicationThumbnail(
        null,
        'https://cdn.example.com/global.png',
      ),
    ).toBe('https://cdn.example.com/global.png')
  })

  it('trata una personalización vacía como ausente', () => {
    expect(
      getMunicipalityApplicationThumbnail(
        '   ',
        'https://cdn.example.com/global.png',
      ),
    ).toBe('https://cdn.example.com/global.png')
  })
})
